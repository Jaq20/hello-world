import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matchBuyersToDeal } from "@/lib/matching";
import { formatCurrency, formatNumber, relativeTime } from "@/lib/format";
import {
  DealStatusBadge,
  InterestStatusBadge,
  OfferStatusBadge,
} from "@/components/badges";
import { CopyLink } from "@/components/CopyLink";
import {
  sendDealToBuyersAction,
  unsendDealAction,
  setDealStatusAction,
  setOfferStatusAction,
  deleteDealPhotoAction,
} from "@/actions/deals";
import { PhotoUploadForm } from "@/components/PhotoUploadForm";
import { MAX_PHOTOS_PER_DEAL } from "@/lib/uploads";
import { SendList } from "@/components/SendList";

export const metadata: Metadata = { title: "Deal — PropFlip" };

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();

  const deal = await prisma.deal.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      interests: { include: { buyer: true } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!deal) notFound();

  const buyers = await prisma.buyer.findMany({ where: { userId: user.id } });
  const ranked = matchBuyersToDeal(buyers, deal);

  const interestByBuyer = new Map(deal.interests.map((i) => [i.buyerId, i]));

  // Recipients (already sent), most recent activity first.
  const recipients = deal.interests
    .slice()
    .sort(
      (a, b) =>
        (b.respondedAt ?? b.viewedAt ?? b.sentAt).getTime() -
        (a.respondedAt ?? a.viewedAt ?? a.sentAt).getTime(),
    );

  // Buyers not yet sent → the send checklist (matches first).
  const candidates = ranked
    .filter((r) => !interestByBuyer.has(r.buyer.id))
    .map((r) => ({
      id: r.buyer.id,
      name: r.buyer.name,
      matched: r.matched,
      reasons: r.reasons,
    }));

  const spread =
    deal.arv != null && deal.askingPrice != null
      ? deal.arv - deal.askingPrice - (deal.repairEstimate ?? 0)
      : null;

  const offers = deal.interests
    .filter((i) => i.offerStatus != null)
    .sort((a, b) => (b.offerAmount ?? 0) - (a.offerAmount ?? 0));
  const archived = deal.status === "archived";

  return (
    <div>
      <Link href="/deals" className="text-sm font-medium text-teal-600 hover:text-teal-700">
        ← Deals
      </Link>

      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {deal.title || deal.address}
            </h1>
            <DealStatusBadge status={deal.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {deal.address}, {deal.city}, {deal.state} {deal.zip ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/deals/${deal.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          {/* Single Archive / Restore toggle */}
          <form action={setDealStatusAction}>
            <input type="hidden" name="dealId" value={deal.id} />
            <input type="hidden" name="status" value={archived ? "active" : "archived"} />
            <button className="btn-ghost">{archived ? "Restore" : "Archive"}</button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-6 lg:col-span-1">
          <div className="card p-5">
            <dl className="grid grid-cols-2 gap-4">
              <Stat label="Asking" value={formatCurrency(deal.askingPrice)} />
              <Stat label="ARV" value={formatCurrency(deal.arv)} />
              <Stat label="Repairs" value={formatCurrency(deal.repairEstimate)} />
              <Stat
                label="Spread"
                value={
                  spread == null ? (
                    "—"
                  ) : (
                    <span className={spread >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(spread)}
                    </span>
                  )
                }
              />
            </dl>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <Stat label="Beds" value={deal.bedrooms ?? "—"} />
              <Stat label="Baths" value={deal.bathrooms ?? "—"} />
              <Stat label="Sq ft" value={formatNumber(deal.sqft)} />
            </div>
            {deal.propertyType && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Stat label="Type" value={deal.propertyType} />
              </div>
            )}
          </div>

          {deal.description && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Description
              </h2>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{deal.description}</p>
            </div>
          )}

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Photos
            </h2>
            {deal.photos.length > 0 ? (
              <div className="mb-4 grid grid-cols-3 gap-2">
                {deal.photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${photo.id}`}
                      alt="Deal photo"
                      className="h-full w-full rounded-lg object-cover ring-1 ring-slate-200"
                    />
                    <form action={deleteDealPhotoAction} className="absolute right-1 top-1">
                      <input type="hidden" name="photoId" value={photo.id} />
                      <button
                        aria-label="Delete photo"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-sm text-slate-500">
                No photos yet. Add a few to help buyers say yes faster.
              </p>
            )}
            <PhotoUploadForm
              dealId={deal.id}
              remaining={MAX_PHOTOS_PER_DEAL - deal.photos.length}
            />
          </div>
        </div>

        {/* Right: send + track */}
        <div className="space-y-6 lg:col-span-2">
          {/* Offers */}
          <div className="card">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Offers</h2>
            </div>
            {offers.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">
                No offers yet. Offers appear here after buyers receive this deal
                and respond.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {offers.map((o) => (
                  <li key={o.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(o.offerAmount)}
                      </span>
                      <OfferStatusBadge status={o.offerStatus ?? "pending"} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {o.buyer.name} · {relativeTime(o.offeredAt)}
                    </p>
                    {o.offerNote && (
                      <p className="mt-1 text-sm text-slate-700">&ldquo;{o.offerNote}&rdquo;</p>
                    )}
                    {o.offerStatus === "pending" && (
                      <div className="mt-2 flex gap-2">
                        <form action={setOfferStatusAction}>
                          <input type="hidden" name="dealId" value={deal.id} />
                          <input type="hidden" name="buyerId" value={o.buyerId} />
                          <input type="hidden" name="offerStatus" value="accepted" />
                          <button className="btn-primary px-2.5 py-1 text-xs">Accept</button>
                        </form>
                        <form action={setOfferStatusAction}>
                          <input type="hidden" name="dealId" value={deal.id} />
                          <input type="hidden" name="buyerId" value={o.buyerId} />
                          <input type="hidden" name="offerStatus" value="declined" />
                          <button className="btn-danger px-2.5 py-1 text-xs">Decline</button>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recipients */}
          {recipients.length > 0 && (
            <div className="card">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">
                  Recipients ({recipients.length})
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {recipients.map((interest) => (
                  <li
                    key={interest.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {interest.buyer.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {interest.offerAmount != null
                          ? `Offered ${formatCurrency(interest.offerAmount)} · ${relativeTime(interest.offeredAt)}`
                          : interest.respondedAt
                            ? `Responded ${relativeTime(interest.respondedAt)}`
                            : interest.viewedAt
                              ? `Opened ${relativeTime(interest.viewedAt)}`
                              : `Sent ${relativeTime(interest.sentAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <InterestStatusBadge status={interest.status} />
                      <CopyLink path={`/d/${interest.token}`} />
                      <form action={unsendDealAction}>
                        <input type="hidden" name="dealId" value={deal.id} />
                        <input type="hidden" name="buyerId" value={interest.buyerId} />
                        <button className="btn-ghost px-2 py-1.5 text-xs text-slate-400 hover:text-red-600">
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Send checklist */}
          <div className="card">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Send to buyers</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Pick buyers and send each a private deal link. Matches are listed
                first.
              </p>
            </div>
            {buyers.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-600">
                You have no buyers yet.{" "}
                <Link href="/buyers/new" className="font-semibold text-teal-600">
                  Add a buyer
                </Link>{" "}
                to start sending.
              </div>
            ) : (
              <SendList
                dealId={deal.id}
                buyers={candidates}
                action={sendDealToBuyersAction}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
