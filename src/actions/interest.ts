"use server";

import { revalidatePath } from "next/cache";
import { rateLimitByIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { recordView, respond, submitOffer } from "@/lib/services/interest";

// Public: record that the recipient opened the deal link.
export async function recordDealView(token: string): Promise<void> {
  await recordView(token);
}

// Public: the recipient passes or expresses interest. Token-authorized.
export async function respondToDealAction(formData: FormData): Promise<void> {
  if (!rateLimitByIp("respond", 30, 60 * 1000).ok) return;

  const token = String(formData.get("token") ?? "");
  const response = String(formData.get("response") ?? "");
  if (response !== "interested" && response !== "passed") return;

  await respond(token, response);
  revalidatePath(`/d/${token}`);
}

// Public: the recipient submits a dollar offer. Token-authorized.
export async function submitOfferAction(formData: FormData): Promise<void> {
  if (!rateLimitByIp("offer", 20, 60 * 1000).ok) return;

  const token = String(formData.get("token") ?? "");
  const result = await submitOffer(
    token,
    String(formData.get("offerAmount") ?? ""),
    String(formData.get("offerNote") ?? ""),
  );

  if (result.ok) {
    await logAudit({
      action: "offer.submit",
      entity: "deal",
      entityId: result.dealId,
      detail: `buyer:${result.buyerId} $${result.amount}`,
    });
  }
  revalidatePath(`/d/${token}`);
}
