import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";

const features = [
  {
    title: "Buyer list",
    body: "Keep every cash buyer in one place with their markets, price range, and property preferences.",
  },
  {
    title: "Post deals fast",
    body: "Add a property in seconds — address, numbers, and notes. Mobile-first so you can do it from the field.",
  },
  {
    title: "Smart matching",
    body: "PropFlip ranks your buyers against each deal so you know who to call first.",
  },
  {
    title: "Track interest",
    body: "Send a private deal link and see who opened it, who's interested, and who passed.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20">
          <div className="max-w-2xl">
            <span className="badge bg-teal-50 text-teal-700">
              Disposition, simplified
            </span>
            <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Move your deals to the right buyers — faster.
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              PropFlip is a lightweight disposition workflow for real estate
              wholesalers. Manage your buyer list, post deals, match buyers, and
              track interest — without the bloat of a full CRM.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                Create your free account
              </Link>
              <Link href="/login" className="btn-secondary px-6 py-3 text-base">
                I already have one
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="card p-5">
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500 sm:px-6">
          © {new Date().getFullYear()} PropFlip. Built for wholesalers.
        </div>
      </footer>
    </div>
  );
}
