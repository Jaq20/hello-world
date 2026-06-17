import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export { prisma };

export async function makeUser() {
  const email = `test_${crypto.randomBytes(8).toString("hex")}@example.com`;
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword("password123") },
  });
}

export async function makeBuyer(userId: string, name = "Buyer") {
  return prisma.buyer.create({ data: { userId, name } });
}

export async function makeDeal(userId: string) {
  return prisma.deal.create({
    data: { userId, address: "1 Test St", city: "Dallas", state: "TX", askingPrice: 100000 },
  });
}

export async function sendTo(dealId: string, buyerId: string) {
  return prisma.dealInterest.create({
    data: { dealId, buyerId, token: crypto.randomBytes(24).toString("hex") },
  });
}

export async function cleanupUsers(ids: string[]) {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
