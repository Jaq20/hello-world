import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { recordDealView, respondToDealAction } from "@/actions/interest";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Wordmark } from "@/components/Brand";

export const metadata: Metadata = {
  title: "A deal for you — PropFlip",
  robots: { index: false, follow: false },
};

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export default async function PublicDealPage({
  params,
}: {
  params: { token: string };
}) {
  // The token is the only credential. It maps to exactly one buyer+deal pair,
  // so we expose only this deal's shared details — nothing else about the
  // wholesaler's account or other buyers.
  const interest = await prisma.dealInterest.findUnique({
    where: { token: params.token },
    include: { deal: true, buyer: true },
  });
  if (!interest) notFound();

  // Archived deals are pulled from circulation.
  if (interest.deal.status === "archived") notFound();

  // Log the open (idempotent; only the first view sets viewedAt).
  await recordDealView(params.token);

  const { deal } = interest;
  const responded = interest.status === "interested" || interest.status === "passed";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <Wordmark />
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <p className="text-sm text-slate-500">
          Hi {interest.buyer.name.split(" ")[0]}, here&apos;s a deal you might want.
        </p>

        <div className="card mt-3 overflow-hidden">
          <div className="bg-teal-600 px-5 py-5 text-white">
            <h1 className="text-xl font-bold">{deal.title || deal.address}</h1>
            <p className="mt-0.5 text-teal-50">
              {deal.address}, {deal.city}, {deal.state} {deal.zip ?? ""}
            </p>
            <p className="mt-3 text-3xl font-extrabold">{formatCurrency(deal.askingPrice)}</p>
            <p className="text-sm text-teal-100">Asking price</p>
          </div>

          <div className="p-5">
            <dl className="grid grid-cols-2 gap-3">
              <Stat label="ARV" value={formatCurrency(deal.arv)} />
              <Stat label="Est. repairs" value={formatCurrency(deal.repairEstimate)} />
              <Stat label="Beds" value={deal.bedrooms ?? "—"} />
              <Stat label="Baths" value={deal.bathrooms ?? "—"} />
              <Stat label="Sq ft" value={formatNumber(deal.sqft)} />
              <Stat label="Type" value={deal.propertyType ?? "—"} />
            </dl>

            {deal.description && (
              <div className="mt-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Details
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {deal.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Response */}
        <div className="card mt-4 p-5">
          {responded ? (
            <div className="text-center">
              {interest.status === "interested" ? (
                <>
                  <p className="text-lg font-semibold text-green-700">You&apos;re interested 🎉</p>
                  <p className="mt-1 text-sm text-slate-600">
                    The seller has been notified and will reach out to you.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-slate-700">Marked as not interested</p>
                  <p className="mt-1 text-sm text-slate-600">Thanks for letting us know.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-center text-sm font-medium text-slate-700">
                Interested in this deal?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <form action={respondToDealAction}>
                  <input type="hidden" name="token" value={interest.token} />
                  <input type="hidden" name="response" value="passed" />
                  <button className="btn-secondary w-full">Pass</button>
                </form>
                <form action={respondToDealAction}>
                  <input type="hidden" name="token" value={interest.token} />
                  <input type="hidden" name="response" value="interested" />
                  <button className="btn-primary w-full">I&apos;m interested</button>
                </form>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Sent via PropFlip · This link is private to you
        </p>
      </main>
    </div>
  );
}
