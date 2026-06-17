import { test, after } from "node:test";
import assert from "node:assert/strict";
import {
  prisma,
  makeUser,
  makeBuyer,
  makeDeal,
  sendTo,
  cleanupUsers,
} from "./helpers";
import { submitOffer } from "@/lib/services/interest";

const created: string[] = [];
after(async () => {
  await cleanupUsers(created);
  await prisma.$disconnect();
});

test("a buyer can submit an offer via their token", async () => {
  const owner = await makeUser();
  created.push(owner.id);
  const deal = await makeDeal(owner.id);
  const buyer = await makeBuyer(owner.id);
  const interest = await sendTo(deal.id, buyer.id);

  const res = await submitOffer(interest.token, "95,000", "Cash, 10 day close");
  assert.equal(res.ok, true);

  const updated = await prisma.dealInterest.findUnique({ where: { token: interest.token } });
  assert.equal(updated?.offerAmount, 95000);
  assert.equal(updated?.offerStatus, "pending");
  assert.equal(updated?.status, "offered");
  assert.equal(updated?.offerNote, "Cash, 10 day close");
});

test("an invalid amount is rejected", async () => {
  const owner = await makeUser();
  created.push(owner.id);
  const deal = await makeDeal(owner.id);
  const buyer = await makeBuyer(owner.id);
  const interest = await sendTo(deal.id, buyer.id);

  const res = await submitOffer(interest.token, "-5");
  assert.equal(res.ok, false);
});

test("an offer on an unknown token is rejected", async () => {
  const res = await submitOffer("bad-token", "100000");
  assert.equal(res.ok, false);
});
