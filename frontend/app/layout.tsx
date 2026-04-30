import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import WakeUpPing from "@/lib/wake-up";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Google Client ID (public — safe to expose)
const GOOGLE_CLIENT_ID = "997587061669-3abhl7jpso6eo88pim5d1ugp9raskseq.apps.googleusercontent.com";

export const metadata: Metadata = {
  title: "FairLens — AI Bias Auditing Platform",
  description:
    "Detect, measure, and fix hidden bias in AI systems. FairLens helps organizations build fair, equitable AI — powered by Google Gemini.",
  keywords: "AI bias, fairness, machine learning audit, bias detection, Gemini AI",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "FairLens — Making AI Fair for Everyone",
    description: "Detect and fix hidden bias in your AI systems in minutes.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="google-signin-client_id" content={GOOGLE_CLIENT_ID} />
      </head>
      <body className="antialiased" style={{ background: "var(--bg-page)", color: "var(--text-primary)" }}>
        {/* Google Identity Services SDK */}
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
        <AuthProvider>
          <WakeUpPing />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
