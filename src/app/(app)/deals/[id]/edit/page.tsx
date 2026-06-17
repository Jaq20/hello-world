import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { DealForm } from "@/components/DealForm";
import { updateDealAction, deleteDealAction } from "@/actions/deals";

export const metadata: Metadata = { title: "Edit deal — PropFlip" };

export default async function EditDealPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const deal = await prisma.deal.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!deal) notFound();

  const update = updateDealAction.bind(null, deal.id);

  return (
    <div>
      <Link href={`/deals/${deal.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-700">
        ← Back to deal
      </Link>
      <PageHeader title="Edit deal" />
      <DealForm
        action={update}
        deal={deal}
        submitLabel="Save changes"
        showStatus
        cancelHref={`/deals/${deal.id}`}
      />

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Danger zone</h3>
        <p className="mt-1 text-sm text-slate-600">
          Deleting a deal removes it and all buyer activity. This can&apos;t be undone.
        </p>
        <form action={deleteDealAction} className="mt-3">
          <input type="hidden" name="dealId" value={deal.id} />
          <button className="btn-danger">Delete deal</button>
        </form>
      </div>
    </div>
  );
}
