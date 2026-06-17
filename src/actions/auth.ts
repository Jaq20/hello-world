"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  getCurrentUser,
} from "@/lib/auth";
import { signupSchema, loginSchema, fieldErrors } from "@/lib/validation";
import { rateLimitByIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import {
  requestPasswordReset,
  consumePasswordReset,
} from "@/lib/services/passwordReset";

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  done?: boolean;
};

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  // Throttle account creation per IP to curb abuse.
  const limit = rateLimitByIp("signup", 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists" } };
  }

  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
  });

  await logAudit({ userId: user.id, action: "user.signup" });
  await createSession(user.id);
  redirect("/deals");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  // Throttle login attempts per IP to slow credential-stuffing/brute force.
  const limit = rateLimitByIp("login", 10, 5 * 60 * 1000);
  if (!limit.ok) {
    return {
      error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run a hash comparison to keep response timing uniform whether or
  // not the email exists, and return a generic error to avoid user enumeration.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");

  if (!user || !ok) {
    await logAudit({
      userId: user?.id ?? null,
      action: "user.login_failed",
      detail: email,
    });
    return { error: "Invalid email or password" };
  }

  await logAudit({ userId: user.id, action: "user.login" });
  await createSession(user.id);
  redirect("/deals");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await logAudit({ userId: user.id, action: "user.logout" });
  await destroySession();
  redirect("/login");
}

// Request a password reset. Always returns a generic success so the response
// can't be used to discover which emails have accounts.
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!rateLimitByIp("pwreset_request", 5, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  const email = z
    .string()
    .email()
    .safeParse(String(formData.get("email") ?? "").trim().toLowerCase());

  if (email.success) {
    const result = await requestPasswordReset(email.data);
    if (result) {
      const h = headers();
      const proto = h.get("x-forwarded-proto") ?? "http";
      const base = `${proto}://${h.get("host")}`;
      const link = `${base}/reset-password?token=${result.token}`;
      await sendEmail({
        to: email.data,
        subject: "Reset your PropFlip password",
        text: `Reset your password using this link (valid for 1 hour):\n\n${link}\n\nIf you didn't request this, you can ignore this email.`,
      });
      await logAudit({ userId: result.userId, action: "user.pwreset_request" });
    }
  }

  // Same response whether or not the account exists.
  return { done: true };
}

// Complete a password reset using the emailed token.
export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!rateLimitByIp("pwreset_confirm", 10, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await consumePasswordReset(token, password);
  if (!result.ok) {
    return { error: result.error };
  }

  await logAudit({ action: "user.pwreset_confirm" });
  redirect("/login?reset=1");
}
