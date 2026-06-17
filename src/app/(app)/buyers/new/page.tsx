import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { BuyerForm } from "@/components/BuyerForm";
import { createBuyerAction } from "@/actions/buyers";

export const metadata: Metadata = { title: "Add buyer — PropFlip" };

export default async function NewBuyerPage() {
  await requireUser();
  return (
    <div>
      <Link href="/buyers" className="text-sm font-medium text-teal-600 hover:text-teal-700">
        ← Buyers
      </Link>
      <PageHeader title="Add buyer" subtitle="Add a cash buyer to your list." />
      <BuyerForm action={createBuyerAction} submitLabel="Add buyer" />
    </div>
  );
}
