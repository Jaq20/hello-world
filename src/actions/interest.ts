"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimitByIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

// Public: record that the recipient opened the deal link. Idempotent — only
// sets viewedAt the first time, and never downgrades an explicit response.
export async function recordDealView(token: string): Promise<void> {
  if (!token) return;
  await prisma.dealInterest.updateMany({
    where: { token, viewedAt: null },
    data: { viewedAt: new Date(), status: "viewed" },
  });
}

// Public: the recipient responds to a deal. The token authorizes the action;
// no account is required. Only the matching interest record can be changed.
export async function respondToDealAction(formData: FormData): Promise<void> {
  if (!rateLimitByIp("respond", 30, 60 * 1000).ok) return;

  const token = String(formData.get("token") ?? "");
  const response = String(formData.get("response") ?? "");
  if (!token || (response !== "interested" && response !== "passed")) return;

  await prisma.dealInterest.updateMany({
    where: { token },
    data: { status: response, respondedAt: new Date() },
  });

  revalidatePath(`/d/${token}`);
}

// Public: the recipient submits a dollar offer on the deal. Token-authorized.
export async function submitOfferAction(formData: FormData): Promise<void> {
  if (!rateLimitByIp("offer", 20, 60 * 1000).ok) return;

  const token = String(formData.get("token") ?? "");
  const note = String(formData.get("offerNote") ?? "").trim().slice(0, 1000) || null;
  const raw = String(formData.get("offerAmount") ?? "").replace(/[,$\s]/g, "");
  const amount = Number(raw);
  if (!token || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    return;
  }

  const interest = await prisma.dealInterest.findUnique({ where: { token } });
  if (!interest) return;

  await prisma.dealInterest.update({
    where: { token },
    data: {
      offerAmount: Math.round(amount),
      offerNote: note,
      offerStatus: "pending",
      offeredAt: new Date(),
      status: "offered",
      respondedAt: new Date(),
    },
  });

  await logAudit({
    action: "offer.submit",
    entity: "deal",
    entityId: interest.dealId,
    detail: `buyer:${interest.buyerId} $${Math.round(amount)}`,
  });
  revalidatePath(`/d/${token}`);
}
