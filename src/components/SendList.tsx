"use client";

import { useState } from "react";

export type SendCandidate = {
  id: string;
  name: string;
  matched: boolean;
  reasons: string[];
};

// A simple, sortable send checklist: tick buyers, then send the deal to all of
// them at once. Matches are listed first with a lightweight "Match" chip.
export function SendList({
  dealId,
  buyers,
  action,
}: {
  dealId: string;
  buyers: SendCandidate[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === buyers.length ? new Set() : new Set(buyers.map((b) => b.id)),
    );
  }

  if (buyers.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-slate-500">
        Every buyer has received this deal.
      </p>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="dealId" value={dealId} />

      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            checked={selected.size === buyers.length && buyers.length > 0}
            onChange={toggleAll}
          />
          Select all
        </label>
        <span className="text-xs text-slate-400">{selected.size} selected</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {buyers.map((b) => (
          <li key={b.id}>
            <label className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50">
              <input
                type="checkbox"
                name="buyerId"
                value={b.id}
                checked={selected.has(b.id)}
                onChange={() => toggle(b.id)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900">{b.name}</span>
                  {b.matched && (
                    <span className="badge bg-green-50 text-green-700">Match</span>
                  )}
                </span>
                {b.reasons.length > 0 && (
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {b.reasons.join(" · ")}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-100 px-5 py-3">
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={selected.size === 0}
        >
          {selected.size > 0 ? `Send to ${selected.size} buyer${selected.size === 1 ? "" : "s"}` : "Select buyers to send"}
        </button>
      </div>
    </form>
  );
}
