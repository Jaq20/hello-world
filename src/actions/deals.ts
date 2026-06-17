"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dealSchema, fieldErrors, DEAL_STATUSES } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { deleteFile } from "@/lib/storage";

export type DealFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const OFFER_STATUSES = ["pending", "accepted", "declined"] as const;

function readDealForm(formData: FormData) {
  return dealSchema.safeParse({
    title: formData.get("title"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
    propertyType: formData.get("propertyType"),
    askingPrice: formData.get("askingPrice"),
    arv: formData.get("arv"),
    repairEstimate: formData.get("repairEstimate"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    sqft: formData.get("sqft"),
    description: formData.get("description"),
    status: formData.get("status") ?? "active",
  });
}

export async function createDealAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  const user = await requireUser();
  const parsed = readDealForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const deal = await prisma.deal.create({
    data: { ...parsed.data, userId: user.id },
  });
  await logAudit({
    userId: user.id,
    action: "deal.create",
    entity: "deal",
    entityId: deal.id,
  });
  revalidatePath("/deals");
  redirect(`/deals/${deal.id}`);
}

export async function updateDealAction(
  dealId: string,
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  const user = await requireUser();
  const parsed = readDealForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const result = await prisma.deal.updateMany({
    where: { id: dealId, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) return { error: "Deal not found" };

  await logAudit({
    userId: user.id,
    action: "deal.update",
    entity: "deal",
    entityId: dealId,
  });
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}`);
}

export async function setDealStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!dealId || !(DEAL_STATUSES as readonly string[]).includes(status)) return;

  const result = await prisma.deal.updateMany({
    where: { id: dealId, userId: user.id },
    data: { status },
  });
  if (result.count > 0) {
    await logAudit({
      userId: user.id,
      action: "deal.status",
      entity: "deal",
      entityId: dealId,
      detail: status,
    });
  }
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

export async function deleteDealAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  if (!dealId) return;

  // Load the deal (scoped to the user) with its photos so we can remove the
  // underlying files; the DB rows cascade with the deal.
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, userId: user.id },
    include: { photos: { select: { storageKey: true } } },
  });
  if (!deal) {
    redirect("/deals");
  }

  await prisma.deal.delete({ where: { id: deal.id } });
  await Promise.all(deal.photos.map((p) => deleteFile(p.storageKey)));

  await logAudit({
    userId: user.id,
    action: "deal.delete",
    entity: "deal",
    entityId: dealId,
  });
  revalidatePath("/deals");
  redirect("/deals");
}

// Delete a single photo from a deal the current user owns.
export async function deleteDealPhotoAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const photoId = String(formData.get("photoId") ?? "");
  if (!photoId) return;

  const photo = await prisma.dealPhoto.findUnique({
    where: { id: photoId },
    include: { deal: { select: { userId: true } } },
  });
  if (!photo || photo.deal.userId !== user.id) return;

  await prisma.dealPhoto.delete({ where: { id: photoId } });
  await deleteFile(photo.storageKey);

  await logAudit({
    userId: user.id,
    action: "deal.photo_delete",
    entity: "deal",
    entityId: photo.dealId,
  });
  revalidatePath(`/deals/${photo.dealId}`);
}

// Send (or re-send) a deal to a buyer: creates a DealInterest with a unique
// public token if one doesn't already exist for this deal+buyer pair.
export async function sendDealToBuyerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  const buyerId = String(formData.get("buyerId") ?? "");
  if (!dealId || !buyerId) return;

  // Verify both the deal and the buyer belong to the current user before
  // linking them — prevents linking across tenants.
  const [deal, buyer] = await Promise.all([
    prisma.deal.findFirst({ where: { id: dealId, userId: user.id } }),
    prisma.buyer.findFirst({ where: { id: buyerId, userId: user.id } }),
  ]);
  if (!deal || !buyer) return;

  await prisma.dealInterest.upsert({
    where: { dealId_buyerId: { dealId, buyerId } },
    create: { dealId, buyerId, token: crypto.randomBytes(24).toString("hex") },
    update: {}, // already sent; keep existing token & engagement
  });

  await logAudit({
    userId: user.id,
    action: "deal.send",
    entity: "deal",
    entityId: dealId,
    detail: `buyer:${buyerId}`,
  });
  revalidatePath(`/deals/${dealId}`);
}

// Owner-side offer outcome. Accept or decline a buyer's offer on a deal the
// current user owns. Scoped through the deal's ownership.
export async function setOfferStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  const buyerId = String(formData.get("buyerId") ?? "");
  const offerStatus = String(formData.get("offerStatus") ?? "");
  if (
    !dealId ||
    !buyerId ||
    !(OFFER_STATUSES as readonly string[]).includes(offerStatus)
  ) {
    return;
  }

  // Confirm the deal belongs to the current user before touching the offer.
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, userId: user.id },
  });
  if (!deal) return;

  // Only update records that actually carry an offer.
  await prisma.dealInterest.updateMany({
    where: { dealId, buyerId, offerStatus: { not: null } },
    data: { offerStatus },
  });

  await logAudit({
    userId: user.id,
    action: "offer.status",
    entity: "deal",
    entityId: dealId,
    detail: `buyer:${buyerId} ${offerStatus}`,
  });
  revalidatePath(`/deals/${dealId}`);
}

export async function unsendDealAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  const buyerId = String(formData.get("buyerId") ?? "");
  if (!dealId || !buyerId) return;

  // Confirm ownership of the deal before removing the link.
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, userId: user.id },
  });
  if (!deal) return;

  await prisma.dealInterest.deleteMany({ where: { dealId, buyerId } });
  revalidatePath(`/deals/${dealId}`);
}
