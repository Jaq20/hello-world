import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { BuyerForm } from "@/components/BuyerForm";
import { updateBuyerAction, deleteBuyerAction } from "@/actions/buyers";

export const metadata: Metadata = { title: "Edit buyer — PropFlip" };

export default async function EditBuyerPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();

  // Scope the lookup by userId — a foreign id simply 404s.
  const buyer = await prisma.buyer.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!buyer) notFound();

  const update = updateBuyerAction.bind(null, buyer.id);

  return (
    <div>
      <Link href="/buyers" className="text-sm font-medium text-teal-600 hover:text-teal-700">
        ← Buyers
      </Link>
      <PageHeader title={buyer.name} subtitle="Edit buyer details and buy box." />
      <BuyerForm action={update} buyer={buyer} submitLabel="Save changes" />

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Danger zone</h3>
        <p className="mt-1 text-sm text-slate-600">
          Deleting a buyer also removes their deal activity. This can&apos;t be undone.
        </p>
        <form action={deleteBuyerAction} className="mt-3">
          <input type="hidden" name="buyerId" value={buyer.id} />
          <button className="btn-danger">Delete buyer</button>
        </form>
      </div>
    </div>
  );
}
