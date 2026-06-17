import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { DealStatusBadge, InterestStatusBadge } from "@/components/badges";
import { formatCurrency, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard — PropFlip" };

export default async function DashboardPage() {
  const user = await requireUser();

  // All counts/queries are scoped to the signed-in user.
  const [buyerCount, activeDeals, totalDeals, interested, recentDeals, recentActivity] =
    await Promise.all([
      prisma.buyer.count({ where: { userId: user.id } }),
      prisma.deal.count({ where: { userId: user.id, status: "active" } }),
      prisma.deal.count({ where: { userId: user.id } }),
      prisma.dealInterest.count({
        where: { status: "interested", deal: { userId: user.id } },
      }),
      prisma.deal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { interests: true } } },
      }),
      prisma.dealInterest.findMany({
        where: { deal: { userId: user.id }, status: { in: ["interested", "viewed"] } },
        orderBy: { sentAt: "desc" },
        take: 6,
        include: { buyer: true, deal: true },
      }),
    ]);

  const firstName = (user.name || "").split(" ")[0];

  return (
    <div>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        subtitle="Your disposition pipeline at a glance."
        action={
          <Link href="/deals/new" className="btn-primary">
            + New deal
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active deals" value={activeDeals} hint={`${totalDeals} total`} />
        <StatCard label="Buyers" value={buyerCount} />
        <StatCard label="Interested" value={interested} hint="across all deals" />
        <StatCard
          label="Sent links"
          value={recentActivity.length > 0 ? "Live" : "—"}
          hint="tracking opens"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent deals
            </h2>
            <Link href="/deals" className="text-sm font-medium text-teal-600 hover:text-teal-700">
              View all
            </Link>
          </div>
          {recentDeals.length === 0 ? (
            <EmptyState
              title="No deals yet"
              body="Post your first property to start matching buyers."
              ctaHref="/deals/new"
              ctaLabel="Add a deal"
            />
          ) : (
            <div className="card divide-y divide-slate-100">
              {recentDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {deal.title || deal.address}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {deal.city}, {deal.state} · {formatCurrency(deal.askingPrice)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {deal._count.interests} sent
                    </span>
                    <DealStatusBadge status={deal.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Buyer activity
          </h2>
          {recentActivity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              body="When you send deal links, opens and responses show up here."
            />
          ) : (
            <div className="card divide-y divide-slate-100">
              {recentActivity.map((a) => (
                <Link
                  key={a.id}
                  href={`/deals/${a.dealId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{a.buyer.name}</p>
                    <p className="truncate text-sm text-slate-500">
                      {a.deal.title || a.deal.address} ·{" "}
                      {relativeTime(a.respondedAt ?? a.viewedAt ?? a.sentAt)}
                    </p>
                  </div>
                  <InterestStatusBadge status={a.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
