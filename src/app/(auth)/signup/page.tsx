import type { Metadata } from "next";
import { SignupForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create account — PropFlip" };

export default function SignupPage() {
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Start managing your disposition pipeline in minutes.
      </p>
      <SignupForm />
    </div>
  );
}
