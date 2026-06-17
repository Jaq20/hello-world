import "server-only";
import { prisma } from "@/lib/prisma";

// Pure-ish data operations for the public, token-authorized deal flow. Kept
// free of request context (cookies/headers) so they are directly unit-testable
// and so all DB access for this flow lives in one place.

export async function getInterestByToken(token: string) {
  if (!token) return null;
  return prisma.dealInterest.findUnique({
    where: { token },
    include: {
      deal: { include: { photos: { orderBy: { createdAt: "asc" } } } },
      buyer: true,
    },
  });
}

// Idempotent first-open tracking.
export async function recordView(token: string): Promise<void> {
  if (!token) return;
  await prisma.dealInterest.updateMany({
    where: { token, viewedAt: null },
    data: { viewedAt: new Date(), status: "viewed" },
  });
}

export type RespondResult =
  | { ok: true; dealId: string; buyerId: string }
  | { ok: false };

export async function respond(
  token: string,
  response: "interested" | "passed",
): Promise<RespondResult> {
  if (!token) return { ok: false };
  const interest = await prisma.dealInterest.findUnique({ where: { token } });
  if (!interest) return { ok: false };
  await prisma.dealInterest.update({
    where: { token },
    data: { status: response, respondedAt: new Date() },
  });
  return { ok: true, dealId: interest.dealId, buyerId: interest.buyerId };
}

export type OfferResult =
  | { ok: true; dealId: string; buyerId: string; amount: number }
  | { ok: false; error: string };

// Validate and record a buyer's dollar offer. The token is the only credential.
export async function submitOffer(
  token: string,
  amountRaw: string | number,
  note?: string | null,
): Promise<OfferResult> {
  if (!token) return { ok: false, error: "Missing token" };

  const amount =
    typeof amountRaw === "number"
      ? amountRaw
      : Number(String(amountRaw).replace(/[,$\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return { ok: false, error: "Invalid amount" };
  }

  const cleanNote = (note ?? "").toString().trim().slice(0, 1000) || null;

  const interest = await prisma.dealInterest.findUnique({ where: { token } });
  if (!interest) return { ok: false, error: "Not found" };

  await prisma.dealInterest.update({
    where: { token },
    data: {
      offerAmount: Math.round(amount),
      offerNote: cleanNote,
      offerStatus: "pending",
      offeredAt: new Date(),
      status: "offered",
      respondedAt: new Date(),
    },
  });

  return {
    ok: true,
    dealId: interest.dealId,
    buyerId: interest.buyerId,
    amount: Math.round(amount),
  };
}
