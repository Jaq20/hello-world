import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const MIN_PASSWORD = 8;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Create a single-use reset token for the email's owner. Returns the raw token
// when (and only when) the account exists. Callers must NOT leak that
// distinction to the client — always show a generic confirmation.
export async function requestPasswordReset(
  rawEmail: string,
): Promise<{ token: string; userId: string } | null> {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  // Invalidate any prior outstanding tokens for this user.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  return { token, userId: user.id };
}

export type ConsumeResult = { ok: true } | { ok: false; error: string };

// Validate a reset token and set the new password. On success the token is
// consumed and every existing session for the user is revoked.
export async function consumePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<ConsumeResult> {
  if (!rawToken) return { ok: false, error: "Invalid or expired link" };
  if (!newPassword || newPassword.length < MIN_PASSWORD) {
    return { ok: false, error: `Use at least ${MIN_PASSWORD} characters` };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "Invalid or expired link" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
    // Revoke all sessions so a leaked old session can't survive a reset.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { ok: true };
}
