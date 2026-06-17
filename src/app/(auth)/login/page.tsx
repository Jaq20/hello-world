import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Sign in — PropFlip" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { reset?: string };
}) {
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Sign in to manage your deals and buyers.
      </p>
      {searchParams.reset === "1" && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Password updated. Sign in with your new password.
        </div>
      )}
      <LoginForm />
    </div>
  );
}
