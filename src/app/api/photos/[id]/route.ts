import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { readFile } from "@/lib/storage";

// Serve a deal photo. Authorized two ways, mirroring who is allowed to see a
// deal: the owner (via session) or a recipient holding the deal's private
// token (?t=). Anything else 404s — image ids are never publicly browsable.
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const photo = await prisma.dealPhoto.findUnique({
    where: { id: params.id },
    include: { deal: { select: { userId: true, status: true } } },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  let authorized = false;

  const user = await getCurrentUser();
  if (user && photo.deal.userId === user.id) {
    authorized = true;
  } else {
    const token = new URL(request.url).searchParams.get("t");
    if (token && photo.deal.status !== "archived") {
      const interest = await prisma.dealInterest.findFirst({
        where: { token, dealId: photo.dealId },
        select: { id: true },
      });
      authorized = Boolean(interest);
    }
  }

  if (!authorized) return new Response("Not found", { status: 404 });

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
