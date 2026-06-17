"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buyerSchema, fieldErrors } from "@/lib/validation";

export type BuyerFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function readBuyerForm(formData: FormData) {
  return buyerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
    markets: formData.get("markets"),
    propertyTypes: formData.get("propertyTypes"),
    minPrice: formData.get("minPrice"),
    maxPrice: formData.get("maxPrice"),
  });
}

export async function createBuyerAction(
  _prev: BuyerFormState,
  formData: FormData,
): Promise<BuyerFormState> {
  const user = await requireUser();
  const parsed = readBuyerForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  await prisma.buyer.create({ data: { ...parsed.data, userId: user.id } });
  revalidatePath("/buyers");
  redirect("/buyers");
}

export async function updateBuyerAction(
  buyerId: string,
  _prev: BuyerFormState,
  formData: FormData,
): Promise<BuyerFormState> {
  const user = await requireUser();
  const parsed = readBuyerForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  // Scope by userId so a user can never edit another user's record.
  const result = await prisma.buyer.updateMany({
    where: { id: buyerId, userId: user.id },
    data: parsed.data,
  });
  if (result.count === 0) return { error: "Buyer not found" };

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyerId}`);
  redirect("/buyers");
}

export async function deleteBuyerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const buyerId = String(formData.get("buyerId") ?? "");
  if (!buyerId) return;

  await prisma.buyer.deleteMany({ where: { id: buyerId, userId: user.id } });
  revalidatePath("/buyers");
  redirect("/buyers");
}
