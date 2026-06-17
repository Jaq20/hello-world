"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/SubmitButton";
import { loginAction, signupAction, type AuthState } from "@/actions/auth";

const initial: AuthState = {};

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {message}
    </div>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(loginAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.error} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          placeholder="you@example.com"
        />
        {state.fieldErrors?.email && (
          <p className="field-error">{state.fieldErrors.email}</p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
        {state.fieldErrors?.password && (
          <p className="field-error">{state.fieldErrors.password}</p>
        )}
      </div>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        New to PropFlip?{" "}
        <Link href="/signup" className="font-semibold text-teal-600 hover:text-teal-700">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useFormState(signupAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.error} />
      <div>
        <label className="label" htmlFor="name">
          Name <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="input"
          placeholder="Jane Wholesaler"
        />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          placeholder="you@example.com"
        />
        {state.fieldErrors?.email && (
          <p className="field-error">{state.fieldErrors.email}</p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
          placeholder="At least 8 characters"
        />
        {state.fieldErrors?.password && (
          <p className="field-error">{state.fieldErrors.password}</p>
        )}
      </div>
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
