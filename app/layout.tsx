import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Upskilling Labs — Onboarding",
  description:
    "Clickable prototype of the new participant onboarding flow for The Upskilling Labs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-midnight font-sans text-cloud antialiased">
        {children}
      </body>
    </html>
  );
}
