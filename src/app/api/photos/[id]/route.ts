import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";
import { canViewPhoto } from "@/lib/services/photos";

// Serve a deal photo. Authorized only for the owner (session) or a holder of
// the deal's private token (?t=). Anything else 404s — ids are never browsable.
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const photo = await prisma.dealPhoto.findUnique({
    where: { id: params.id },
    include: { deal: { select: { userId: true, status: true } } },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  const token = new URL(request.url).searchParams.get("t");

  const allowed = await canViewPhoto(photo, { userId: user?.id, token });
  if (!allowed) return new Response("Not found", { status: 404 });

  const data = await readFile(photo.storageKey).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Disposition": "inline",
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
