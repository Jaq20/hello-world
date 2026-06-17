import Link from "next/link";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Set new password — PropFlip" };

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";

  if (!token) {
    return (
      <div className="card p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900">Invalid link</h1>
        <p className="mt-1 text-sm text-slate-600">
          This reset link is missing or malformed.{" "}
          <Link href="/forgot-password" className="font-semibold text-teal-600">
            Request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-xl font-bold text-slate-900">Set a new password</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Choose a new password for your account.
      </p>
      <ResetPasswordForm token={token} />
    </div>
  );
}
