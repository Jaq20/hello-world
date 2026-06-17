import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { DealStatusBadge } from "@/components/badges";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Deals — PropFlip" };

export default async function DealsPage() {
  const user = await requireUser();

  const [deals, activeDeals, pendingOffers, totalBuyers] = await Promise.all([
    prisma.deal.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { interests: true } },
        interests: { where: { status: "interested" }, select: { id: true } },
      },
    }),
    prisma.deal.count({ where: { userId: user.id, status: "active" } }),
    prisma.dealInterest.count({
      where: { offerStatus: "pending", deal: { userId: user.id } },
    }),
    prisma.buyer.count({ where: { userId: user.id } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Deals"
        action={
          <Link href="/deals/new" className="btn-primary">
            + New deal
          </Link>
        }
      />

      {/* Thin summary header */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:max-w-md">
        <Summary label="Active deals" value={activeDeals} />
        <Summary label="Pending offers" value={pendingOffers} />
        <Summary label="Buyers" value={totalBuyers} />
      </div>

      {deals.length === 0 ? (
        <EmptyState
          title="No deals yet"
          body="Post your first property, then send it to the buyers most likely to want it."
          ctaHref="/deals/new"
          ctaLabel="Add your first deal"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className={`card p-4 transition hover:ring-teal-300 ${
                deal.status === "archived" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">
                  {deal.title || deal.address}
                </h3>
                <DealStatusBadge status={deal.status} />
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {deal.address !== (deal.title || deal.address) ? `${deal.address} · ` : ""}
                {deal.city}, {deal.state}
              </p>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(deal.askingPrice)}
                </p>
                <p className="text-xs text-slate-500">
                  {deal._count.interests} sent · {deal.interests.length} interested
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-3 py-2.5 text-center">
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
