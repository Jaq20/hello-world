"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dealSchema, fieldErrors, DEAL_STATUSES } from "@/lib/validation";

export type DealFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

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

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}`);
}

export async function setDealStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!dealId || !(DEAL_STATUSES as readonly string[]).includes(status)) return;

  await prisma.deal.updateMany({
    where: { id: dealId, userId: user.id },
    data: { status },
  });
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

export async function deleteDealAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  if (!dealId) return;

  await prisma.deal.deleteMany({ where: { id: dealId, userId: user.id } });
  revalidatePath("/deals");
  redirect("/deals");
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
