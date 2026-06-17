import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveFile } from "@/lib/storage";
import { processImage } from "@/lib/images";
import { logAudit } from "@/lib/audit";
import { rateLimitByIp } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/http";
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
  // Reject cross-site form posts (defense-in-depth CSRF).
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

    const raw = Buffer.from(await file.arrayBuffer());

    // Validate by content, not by the client's claimed type/extension.
    const sniffed = sniffImageMime(raw);
    if (!sniffed) continue;

    // Strip EXIF (incl. GPS), auto-orient, and downscale before storing.
    let data: Buffer;
    let mime: string;
    try {
      ({ data, mime } = await processImage(raw, sniffed));
    } catch {
      continue; // unreadable/garbage image — skip
    }

    const key = crypto.randomBytes(16).toString("hex") + extForMime(mime);
    await saveFile(key, data, mime);
    await prisma.dealPhoto.create({
      data: { dealId: deal.id, storageKey: key, mimeType: mime, size: data.length },
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

  // 303 forces a GET back to the deal so the post lands on the updated page.
  return NextResponse.redirect(new URL(`/deals/${deal.id}`, request.url), 303);
}
