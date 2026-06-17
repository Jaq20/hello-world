import Link from "next/link";
import { Wordmark } from "@/components/Brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Wordmark />
      <h1 className="mt-8 text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-slate-600">
        That link is invalid or the item no longer exists.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Go home
      </Link>
    </div>
  );
}
