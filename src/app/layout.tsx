import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitFlair — AI Repo Intelligence",
  description: "Index any public GitHub repository and ask natural language questions. Get AI-grounded answers with file paths and line ranges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen antialiased`}>
        {/* Subtle radial gradient background */}
        <div className="fixed inset-0 -z-10" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30, 58, 138, 0.12) 0%, transparent 60%), #09090b'
        }} />
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
