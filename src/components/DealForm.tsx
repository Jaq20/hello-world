"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import type { Deal } from "@prisma/client";
import { SubmitButton } from "@/components/SubmitButton";
import { PROPERTY_TYPES, DEAL_STATUSES } from "@/lib/validation";
import { titleCase } from "@/lib/format";
import type { DealFormState } from "@/actions/deals";

type Action = (state: DealFormState, formData: FormData) => Promise<DealFormState>;

export function DealForm({
  action,
  deal,
  submitLabel,
  showStatus = false,
  cancelHref,
}: {
  action: Action;
  deal?: Deal;
  submitLabel: string;
  showStatus?: boolean;
  cancelHref: string;
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
          Property
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">
              Title <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input id="title" name="title" className="input" placeholder="Off-market 3/2 in Oak Cliff" defaultValue={deal?.title ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address">Address</label>
            <input id="address" name="address" className="input" required defaultValue={deal?.address ?? ""} />
            {err.address && <p className="field-error">{err.address}</p>}
          </div>
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" className="input" required defaultValue={deal?.city ?? ""} />
            {err.city && <p className="field-error">{err.city}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="state">State</label>
              <input id="state" name="state" className="input" required placeholder="TX" defaultValue={deal?.state ?? ""} />
              {err.state && <p className="field-error">{err.state}</p>}
            </div>
            <div>
              <label className="label" htmlFor="zip">ZIP</label>
              <input id="zip" name="zip" className="input" inputMode="numeric" defaultValue={deal?.zip ?? ""} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="propertyType">Property type</label>
            <select id="propertyType" name="propertyType" className="input" defaultValue={deal?.propertyType ?? ""}>
              <option value="">Select…</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {showStatus && (
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" name="status" className="input" defaultValue={deal?.status ?? "active"}>
                {DEAL_STATUSES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Numbers
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="askingPrice">Asking price</label>
            <input id="askingPrice" name="askingPrice" inputMode="numeric" className="input" placeholder="185000" defaultValue={deal?.askingPrice ?? ""} />
            {err.askingPrice && <p className="field-error">{err.askingPrice}</p>}
          </div>
          <div>
            <label className="label" htmlFor="arv">ARV</label>
            <input id="arv" name="arv" inputMode="numeric" className="input" placeholder="280000" defaultValue={deal?.arv ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="repairEstimate">Repair est.</label>
            <input id="repairEstimate" name="repairEstimate" inputMode="numeric" className="input" placeholder="45000" defaultValue={deal?.repairEstimate ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="bedrooms">Beds</label>
            <input id="bedrooms" name="bedrooms" inputMode="numeric" className="input" defaultValue={deal?.bedrooms ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="bathrooms">Baths</label>
            <input id="bathrooms" name="bathrooms" inputMode="decimal" className="input" defaultValue={deal?.bathrooms ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="sqft">Sq ft</label>
            <input id="sqft" name="sqft" inputMode="numeric" className="input" defaultValue={deal?.sqft ?? ""} />
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <label className="label" htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="input"
          placeholder="Condition, occupancy, access, deal terms…"
          defaultValue={deal?.description ?? ""}
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton className="btn-primary" pendingText="Saving…">
          {submitLabel}
        </SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
