import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Buyers — PropFlip" };

function priceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Any price";
  if (min != null && max != null) return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  if (min != null) return `${formatCurrency(min)}+`;
  return `Up to ${formatCurrency(max)}`;
}

export default async function BuyersPage() {
  const user = await requireUser();
  const buyers = await prisma.buyer.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { interests: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Buyers"
        subtitle={`${buyers.length} buyer${buyers.length === 1 ? "" : "s"} on your list`}
        action={
          <Link href="/buyers/new" className="btn-primary">
            + Add buyer
          </Link>
        }
      />

      {buyers.length === 0 ? (
        <EmptyState
          title="No buyers yet"
          body="Build your cash buyer list so PropFlip can match them to your deals."
          ctaHref="/buyers/new"
          ctaLabel="Add your first buyer"
        />
      ) : (
        <div className="card divide-y divide-slate-100">
          {buyers.map((b) => (
            <Link
              key={b.id}
              href={`/buyers/${b.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{b.name}</p>
                <p className="truncate text-sm text-slate-500">
                  {b.markets || "No markets set"} · {priceRange(b.minPrice, b.maxPrice)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {b._count.interests > 0 && (
                  <span className="text-xs text-slate-400">
                    {b._count.interests} deal{b._count.interests === 1 ? "" : "s"}
                  </span>
                )}
                <svg className="ml-2 inline h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
