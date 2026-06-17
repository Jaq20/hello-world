import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, makeUser, cleanupUsers } from "./helpers";
import {
  requestPasswordReset,
  consumePasswordReset,
} from "@/lib/services/passwordReset";
import { verifyPassword } from "@/lib/auth";

const created: string[] = [];
after(async () => {
  await cleanupUsers(created);
  await prisma.$disconnect();
});

test("reset for an unknown email yields no token (no enumeration)", async () => {
  const res = await requestPasswordReset("nobody_here@example.com");
  assert.equal(res, null);
});

test("a full reset updates the password and revokes sessions", async () => {
  const user = await makeUser();
  created.push(user.id);
  // Seed a session that should be revoked on reset.
  await prisma.session.create({
    data: { userId: user.id, tokenHash: "sess-hash", expiresAt: new Date(Date.now() + 1e6) },
  });

  const req = await requestPasswordReset(user.email);
  assert.ok(req?.token);

  const res = await consumePasswordReset(req!.token, "brandNewPassword1");
  assert.equal(res.ok, true);

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  assert.equal(await verifyPassword("brandNewPassword1", fresh!.passwordHash), true);

  const sessions = await prisma.session.count({ where: { userId: user.id } });
  assert.equal(sessions, 0);
});

test("a reset token cannot be reused", async () => {
  const user = await makeUser();
  created.push(user.id);
  const req = await requestPasswordReset(user.email);
  const first = await consumePasswordReset(req!.token, "firstPassword1");
  assert.equal(first.ok, true);
  const second = await consumePasswordReset(req!.token, "secondPassword2");
  assert.equal(second.ok, false);
});

test("too-short passwords are rejected", async () => {
  const user = await makeUser();
  created.push(user.id);
  const req = await requestPasswordReset(user.email);
  const res = await consumePasswordReset(req!.token, "short");
  assert.equal(res.ok, false);
});
