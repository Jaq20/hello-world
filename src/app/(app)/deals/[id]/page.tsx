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
  sendDealToBuyerAction,
  unsendDealAction,
  setDealStatusAction,
  setOfferStatusAction,
} from "@/actions/deals";
import { DEAL_STATUSES } from "@/lib/validation";
import { titleCase } from "@/lib/format";

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
    include: { interests: { include: { buyer: true } } },
  });
  if (!deal) notFound();

  const buyers = await prisma.buyer.findMany({ where: { userId: user.id } });
  const ranked = matchBuyersToDeal(buyers, deal);

  // Map buyerId -> existing interest record (already-sent buyers).
  const interestByBuyer = new Map(deal.interests.map((i) => [i.buyerId, i]));

  const spread =
    deal.arv != null && deal.askingPrice != null
      ? deal.arv - deal.askingPrice - (deal.repairEstimate ?? 0)
      : null;

  const sentCount = deal.interests.length;
  const interestedCount = deal.interests.filter((i) => i.status === "interested").length;
  const offers = deal.interests.filter((i) => i.offerStatus != null);

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
        <Link href={`/deals/${deal.id}/edit`} className="btn-secondary">
          Edit
        </Link>
      </div>

      {/* Quick status switcher */}
      <div className="mb-6 flex flex-wrap gap-2">
        {DEAL_STATUSES.map((s) => (
          <form action={setDealStatusAction} key={s}>
            <input type="hidden" name="dealId" value={deal.id} />
            <input type="hidden" name="status" value={s} />
            <button
              className={`badge cursor-pointer ${
                deal.status === s
                  ? "bg-teal-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
              }`}
            >
              {titleCase(s)}
            </button>
          </form>
        ))}
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
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Engagement
            </h2>
            <p className="text-sm text-slate-600">
              Sent to <span className="font-semibold text-slate-900">{sentCount}</span> ·{" "}
              <span className="font-semibold text-green-600">{interestedCount}</span> interested ·{" "}
              <span className="font-semibold text-indigo-600">{offers.length}</span> offer
              {offers.length === 1 ? "" : "s"}
            </p>
          </div>

          {offers.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Offers
              </h2>
              <ul className="space-y-3">
                {offers
                  .slice()
                  .sort((a, b) => (b.offerAmount ?? 0) - (a.offerAmount ?? 0))
                  .map((o) => (
                    <li key={o.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(o.offerAmount)}
                        </span>
                        <OfferStatusBadge status={o.offerStatus ?? "pending"} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {o.buyer.name} · {relativeTime(o.offeredAt)}
                      </p>
                      {o.offerNote && (
                        <p className="mt-1 text-sm text-slate-700">
                          &ldquo;{o.offerNote}&rdquo;
                        </p>
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
            </div>
          )}
        </div>

        {/* Right: matching & sending */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Match &amp; send</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Buyers ranked by fit. Send a private link and track interest.
              </p>
            </div>

            {ranked.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-600">
                You have no buyers yet.{" "}
                <Link href="/buyers/new" className="font-semibold text-teal-600">
                  Add a buyer
                </Link>{" "}
                to start matching.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {ranked.map(({ buyer, matched, reasons, misses }) => {
                  const interest = interestByBuyer.get(buyer.id);
                  return (
                    <li key={buyer.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-slate-900">{buyer.name}</p>
                          {matched ? (
                            <span className="badge bg-green-50 text-green-700">Match</span>
                          ) : (
                            <span className="badge bg-slate-100 text-slate-500">Low fit</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {(reasons.length ? reasons : misses).join(" · ") || "No criteria set"}
                        </p>
                        {interest && (
                          <p className="mt-1 text-xs text-slate-400">
                            {interest.offerAmount != null
                              ? `Offered ${formatCurrency(interest.offerAmount)} · ${relativeTime(interest.offeredAt)}`
                              : interest.respondedAt
                                ? `Responded ${relativeTime(interest.respondedAt)}`
                                : interest.viewedAt
                                  ? `Opened ${relativeTime(interest.viewedAt)}`
                                  : `Sent ${relativeTime(interest.sentAt)}`}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {interest ? (
                          <>
                            <InterestStatusBadge status={interest.status} />
                            <CopyLink path={`/d/${interest.token}`} />
                            <form action={unsendDealAction}>
                              <input type="hidden" name="dealId" value={deal.id} />
                              <input type="hidden" name="buyerId" value={buyer.id} />
                              <button className="btn-ghost px-2 py-1.5 text-xs text-slate-400 hover:text-red-600">
                                Remove
                              </button>
                            </form>
                          </>
                        ) : (
                          <form action={sendDealToBuyerAction}>
                            <input type="hidden" name="dealId" value={deal.id} />
                            <input type="hidden" name="buyerId" value={buyer.id} />
                            <button className="btn-primary px-3 py-1.5 text-xs">Send</button>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
