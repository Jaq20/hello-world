import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { DealForm } from "@/components/DealForm";
import { createDealAction } from "@/actions/deals";

export const metadata: Metadata = { title: "New deal — PropFlip" };

export default async function NewDealPage() {
  await requireUser();
  return (
    <div>
      <Link href="/deals" className="text-sm font-medium text-teal-600 hover:text-teal-700">
        ← Deals
      </Link>
      <PageHeader title="New deal" subtitle="Post a property to your pipeline." />
      <DealForm action={createDealAction} submitLabel="Create deal" cancelHref="/deals" />
    </div>
  );
}
