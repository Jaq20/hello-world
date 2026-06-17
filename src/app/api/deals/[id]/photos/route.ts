import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { rateLimitByIp } from "@/lib/rate-limit";
import {
  MAX_PHOTOS_PER_DEAL,
  MAX_PHOTO_BYTES,
  sniffImageMime,
  extForMime,
} from "@/lib/uploads";

// Upload one or more photos to a deal the current user owns.
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimitByIp("upload", 60, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
  }

  // Ownership check — a foreign deal id is indistinguishable from missing.
  const deal = await prisma.deal.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!deal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await request.formData();
  const files = form
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const existing = await prisma.dealPhoto.count({ where: { dealId: deal.id } });
  let remaining = MAX_PHOTOS_PER_DEAL - existing;
  let saved = 0;

  for (const file of files) {
    if (remaining <= 0) break;
    if (file.size > MAX_PHOTO_BYTES) continue;

    const buf = Buffer.from(await file.arrayBuffer());

    // Validate by content, not by the client's claimed type/extension.
    const mime = sniffImageMime(buf);
    if (!mime) continue;

    const key = crypto.randomBytes(16).toString("hex") + extForMime(mime);
    await saveFile(key, buf);
    await prisma.dealPhoto.create({
      data: { dealId: deal.id, storageKey: key, mimeType: mime, size: buf.length },
    });
    remaining -= 1;
    saved += 1;
  }

  if (saved > 0) {
    await logAudit({
      userId: user.id,
      action: "deal.photos_upload",
      entity: "deal",
      entityId: deal.id,
      detail: `${saved} photo(s)`,
    });
  }

  // Redirect back to the deal (303 forces a GET) so the form post lands on the
  // updated page.
  return NextResponse.redirect(new URL(`/deals/${deal.id}`, request.url), 303);
}
