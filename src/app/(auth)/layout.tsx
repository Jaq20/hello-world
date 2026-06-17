import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authenticated users have no business on the login/signup screens.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 py-5 sm:px-6">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
