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
import { getInterestByToken } from "@/lib/services/interest";

const created: string[] = [];
after(async () => {
  await cleanupUsers(created);
  await prisma.$disconnect();
});

test("a private token resolves only to its intended recipient", async () => {
  const owner = await makeUser();
  created.push(owner.id);
  const deal = await makeDeal(owner.id);
  const buyer1 = await makeBuyer(owner.id, "Buyer One");
  const buyer2 = await makeBuyer(owner.id, "Buyer Two");
  const i1 = await sendTo(deal.id, buyer1.id);
  const i2 = await sendTo(deal.id, buyer2.id);

  const r1 = await getInterestByToken(i1.token);
  assert.equal(r1?.buyerId, buyer1.id);
  assert.notEqual(r1?.buyerId, buyer2.id);

  const r2 = await getInterestByToken(i2.token);
  assert.equal(r2?.buyerId, buyer2.id);
});

test("an unknown token resolves to nothing", async () => {
  assert.equal(await getInterestByToken("nonexistent-token"), null);
  assert.equal(await getInterestByToken(""), null);
});
