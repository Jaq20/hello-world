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
import { canViewPhoto } from "@/lib/services/photos";

const created: string[] = [];
after(async () => {
  await cleanupUsers(created);
  await prisma.$disconnect();
});

async function setup() {
  const owner = await makeUser();
  const other = await makeUser();
  created.push(owner.id, other.id);
  const deal = await makeDeal(owner.id);
  const buyer = await makeBuyer(owner.id);
  const interest = await sendTo(deal.id, buyer.id);
  const photo = await prisma.dealPhoto.create({
    data: { dealId: deal.id, storageKey: "k.jpg", mimeType: "image/jpeg", size: 10 },
  });
  const full = { dealId: deal.id, deal: { userId: owner.id, status: deal.status } };
  return { owner, other, interest, photo, full };
}

test("owner can view photo", async () => {
  const { owner, full } = await setup();
  assert.equal(await canViewPhoto(full, { userId: owner.id }), true);
});

test("a different user cannot view photo", async () => {
  const { other, full } = await setup();
  assert.equal(await canViewPhoto(full, { userId: other.id }), false);
});

test("no session and no token cannot view photo", async () => {
  const { full } = await setup();
  assert.equal(await canViewPhoto(full, {}), false);
});

test("the deal's private token can view photo", async () => {
  const { interest, full } = await setup();
  assert.equal(await canViewPhoto(full, { token: interest.token }), true);
});

test("a wrong token cannot view photo", async () => {
  const { full } = await setup();
  assert.equal(await canViewPhoto(full, { token: "not-a-real-token" }), false);
});
