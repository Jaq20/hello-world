import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Reset password — PropFlip" };

export default function ForgotPasswordPage() {
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
