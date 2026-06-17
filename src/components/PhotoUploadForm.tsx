"use client";

import { useState } from "react";

// Native multipart POST to the upload route handler (route handlers accept
// larger bodies than server actions, which suit image files). Keeps the UX
// light: shows the selected count and a pending state.
export function PhotoUploadForm({
  dealId,
  remaining,
}: {
  dealId: string;
  remaining: number;
}) {
  const [count, setCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const disabled = remaining <= 0;

  return (
    <form
      action={`/api/deals/${dealId}/photos`}
      method="post"
      encType="multipart/form-data"
      onSubmit={() => setSubmitting(true)}
      className="space-y-3"
    >
      <input
        type="file"
        name="photos"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled}
        onChange={(e) => setCount(e.target.files?.length ?? 0)}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0
                   file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold
                   file:text-teal-700 hover:file:bg-teal-100 disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          JPG, PNG, or WEBP · up to 5MB each ·{" "}
          {remaining > 0 ? `${remaining} slot${remaining === 1 ? "" : "s"} left` : "limit reached"}
        </p>
        <button
          type="submit"
          className="btn-primary px-3 py-1.5 text-xs"
          disabled={disabled || count === 0 || submitting}
        >
          {submitting ? "Uploading…" : count > 0 ? `Upload ${count}` : "Upload"}
        </button>
      </div>
    </form>
  );
}
