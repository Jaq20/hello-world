"use server";

import { redirect } from "next/navigation";
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

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string>;
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
  redirect("/dashboard");
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
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await logAudit({ userId: user.id, action: "user.logout" });
  await destroySession();
  redirect("/login");
}

// Sign out of every device by revoking all of the user's sessions.
export async function logoutEverywhereAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await prisma.session.deleteMany({ where: { userId: user.id } });
  }
  await destroySession();
  redirect("/login");
}
