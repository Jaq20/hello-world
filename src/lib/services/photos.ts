import "server-only";
import { prisma } from "@/lib/prisma";

// Authorization for viewing a deal photo, mirroring who may see the deal:
//   - the owner (by user id), or
//   - a recipient holding the deal's private token (?t=).
// Returns true only when one of those holds; everything else is a 404.
export async function canViewPhoto(
  photo: { dealId: string; deal: { userId: string; status: string } },
  opts: { userId?: string | null; token?: string | null },
): Promise<boolean> {
  if (opts.userId && photo.deal.userId === opts.userId) return true;

  if (opts.token && photo.deal.status !== "archived") {
    const interest = await prisma.dealInterest.findFirst({
      where: { token: opts.token, dealId: photo.dealId },
      select: { id: true },
    });
    return Boolean(interest);
  }
  return false;
}
