import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { BookOpen } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Learning Path – System of Life",
  description: "Structured progressive learning pathway generator and progress tracker.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <header className="sticky top-0 z-50 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-page)" }}>
            <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Learning Path</span>
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 flex flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}