"use client";

import { useState } from "react";

// Copies an absolute URL built from a relative path + the current origin.
export function CopyLink({
  path,
  label = "Copy link",
  className = "btn-secondary px-2.5 py-1.5 text-xs",
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers/contexts without the async clipboard API.
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? "Copied!" : label}
    </button>
  );
}
