// Seed a demo account so you can explore PropFlip immediately.
// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@propflip.app";
const DEMO_PASSWORD = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Idempotent: wipe and recreate the demo user's data on each run.
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: "Demo Wholesaler", passwordHash },
  });

  const buyers = await Promise.all(
    [
      {
        name: "Acme Capital",
        email: "buys@acmecapital.com",
        phone: "214-555-0101",
        markets: "Dallas, Fort Worth, 75201",
        propertyTypes: "Single Family, Townhouse",
        minPrice: 80000,
        maxPrice: 250000,
        notes: "Closes fast, prefers off-market.",
      },
      {
        name: "Lone Star Holdings",
        email: "deals@lonestar.com",
        phone: "817-555-0144",
        markets: "Fort Worth, Arlington",
        propertyTypes: "Single Family",
        minPrice: 100000,
        maxPrice: 200000,
      },
      {
        name: "Bluebonnet Rentals",
        markets: "Austin, Round Rock",
        propertyTypes: "Multi Family",
        minPrice: 200000,
        maxPrice: 600000,
      },
    ].map((data) => prisma.buyer.create({ data: { ...data, userId: user.id } })),
  );

  const deal = await prisma.deal.create({
    data: {
      userId: user.id,
      title: "Off-market 3/2 in Oak Cliff",
      address: "1423 Cliff St",
      city: "Dallas",
      state: "TX",
      zip: "75208",
      propertyType: "Single Family",
      askingPrice: 165000,
      arv: 275000,
      repairEstimate: 45000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1450,
      description: "Vacant, easy access via lockbox. Cosmetic rehab. Clean title.",
      status: "active",
    },
  });

  await prisma.deal.create({
    data: {
      userId: user.id,
      address: "905 Magnolia Ave",
      city: "Fort Worth",
      state: "TX",
      zip: "76104",
      propertyType: "Single Family",
      askingPrice: 132000,
      arv: 210000,
      repairEstimate: 30000,
      bedrooms: 3,
      bathrooms: 1,
      sqft: 1120,
      status: "active",
    },
  });

  // Send the first deal to the two DFW buyers, with some engagement.
  // Acme has viewed and submitted a pending offer.
  await prisma.dealInterest.create({
    data: {
      dealId: deal.id,
      buyerId: buyers[0].id,
      token: crypto.randomBytes(24).toString("hex"),
      status: "offered",
      viewedAt: new Date(Date.now() - 3600_000),
      respondedAt: new Date(Date.now() - 1800_000),
      offerAmount: 158000,
      offerNote: "Can close in 10 days, cash. Subject to walkthrough.",
      offerStatus: "pending",
      offeredAt: new Date(Date.now() - 1800_000),
    },
  });
  await prisma.dealInterest.create({
    data: {
      dealId: deal.id,
      buyerId: buyers[1].id,
      token: crypto.randomBytes(24).toString("hex"),
      status: "viewed",
      viewedAt: new Date(Date.now() - 600_000),
    },
  });

  console.log("Seeded demo account:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
