"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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
  const token = String(formData.get("token") ?? "");
  const response = String(formData.get("response") ?? "");
  if (!token || (response !== "interested" && response !== "passed")) return;

  await prisma.dealInterest.updateMany({
    where: { token },
    data: { status: response, respondedAt: new Date() },
  });

  revalidatePath(`/d/${token}`);
}
