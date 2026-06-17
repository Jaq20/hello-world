export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#0d9488" />
      <path
        d="M16 7l8 6.5V25h-5v-6h-6v6H5V13.5L16 7z"
        fill="white"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 font-bold text-slate-900 ${className}`}>
      <Logo />
      <span className="text-lg tracking-tight">
        Prop<span className="text-teal-600">Flip</span>
      </span>
    </span>
  );
}
