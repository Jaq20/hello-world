"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import type { Buyer } from "@prisma/client";
import { SubmitButton } from "@/components/SubmitButton";
import { PROPERTY_TYPES } from "@/lib/validation";
import type { BuyerFormState } from "@/actions/buyers";

type Action = (state: BuyerFormState, formData: FormData) => Promise<BuyerFormState>;

export function BuyerForm({
  action,
  buyer,
  submitLabel,
}: {
  action: Action;
  buyer?: Buyer;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      )}

      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Contact
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" className="input" defaultValue={buyer?.name ?? ""} required />
            {err.name && <p className="field-error">{err.name}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" defaultValue={buyer?.email ?? ""} />
            {err.email && <p className="field-error">{err.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" className="input" defaultValue={buyer?.phone ?? ""} />
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Buy box
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Used to match this buyer to your deals. Leave blank for no limit.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="markets">Target markets</label>
            <input
              id="markets"
              name="markets"
              className="input"
              placeholder="Dallas, Fort Worth, 75201"
              defaultValue={buyer?.markets ?? ""}
            />
            <p className="mt-1 text-xs text-slate-400">Comma-separated cities, states, or ZIPs.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="propertyTypes">Property types</label>
            <input
              id="propertyTypes"
              name="propertyTypes"
              className="input"
              placeholder="Single Family, Multi Family"
              defaultValue={buyer?.propertyTypes ?? ""}
              list="property-types"
            />
            <datalist id="property-types">
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="minPrice">Min price</label>
            <input id="minPrice" name="minPrice" inputMode="numeric" className="input" placeholder="50000" defaultValue={buyer?.minPrice ?? ""} />
            {err.minPrice && <p className="field-error">{err.minPrice}</p>}
          </div>
          <div>
            <label className="label" htmlFor="maxPrice">Max price</label>
            <input id="maxPrice" name="maxPrice" inputMode="numeric" className="input" placeholder="250000" defaultValue={buyer?.maxPrice ?? ""} />
            {err.maxPrice && <p className="field-error">{err.maxPrice}</p>}
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="input"
          placeholder="Prefers off-market, can close in 7 days…"
          defaultValue={buyer?.notes ?? ""}
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton className="btn-primary" pendingText="Saving…">
          {submitLabel}
        </SubmitButton>
        <Link href="/buyers" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
