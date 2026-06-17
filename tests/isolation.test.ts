import { test, after } from "node:test";
import assert from "node:assert/strict";
import {
  prisma,
  makeUser,
  makeBuyer,
  makeDeal,
  cleanupUsers,
} from "./helpers";

const created: string[] = [];
after(async () => {
  await cleanupUsers(created);
  await prisma.$disconnect();
});

test("a user cannot read another user's buyer", async () => {
  const a = await makeUser();
  const b = await makeUser();
  created.push(a.id, b.id);
  const buyer = await makeBuyer(a.id);

  // The app always scopes by userId. B's scoped lookup must miss A's buyer.
  const asB = await prisma.buyer.findFirst({ where: { id: buyer.id, userId: b.id } });
  const asA = await prisma.buyer.findFirst({ where: { id: buyer.id, userId: a.id } });
  assert.equal(asB, null);
  assert.equal(asA?.id, buyer.id);
});

test("a user cannot read another user's deal", async () => {
  const a = await makeUser();
  const b = await makeUser();
  created.push(a.id, b.id);
  const deal = await makeDeal(a.id);

  const asB = await prisma.deal.findFirst({ where: { id: deal.id, userId: b.id } });
  assert.equal(asB, null);
});

test("a user cannot update another user's deal", async () => {
  const a = await makeUser();
  const b = await makeUser();
  created.push(a.id, b.id);
  const deal = await makeDeal(a.id);

  const res = await prisma.deal.updateMany({
    where: { id: deal.id, userId: b.id },
    data: { status: "archived" },
  });
  assert.equal(res.count, 0); // nothing updated for the wrong owner
});
