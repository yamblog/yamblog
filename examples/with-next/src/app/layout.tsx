import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { blog } from "@/lib/blog";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves root-relative metadata URLs (canonical, og:image) to absolute ones.
  // blog.siteUrl comes from NEXT_PUBLIC_SITE_URL (or Vercel's env) via defineBlog.
  metadataBase: new URL(blog.siteUrl || "http://localhost:3000"),
  title: "Yamblog Example",
  description: "A Next.js App Router blog powered by Yamblog",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
