import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropFlip — Disposition workflow for wholesalers",
  description:
    "Manage your buyer list, post deals, match buyers, and track interest — built for real estate wholesalers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
