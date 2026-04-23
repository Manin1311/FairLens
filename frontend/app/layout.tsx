import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import WakeUpPing from "@/lib/wake-up";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FairLens — AI Bias Auditing Platform",
  description:
    "Detect, measure, and fix hidden bias in AI systems. FairLens helps organizations build fair, equitable AI — powered by Google Gemini.",
  keywords: "AI bias, fairness, machine learning audit, bias detection, Gemini AI",
  openGraph: {
    title: "FairLens — Making AI Fair for Everyone",
    description: "Detect and fix hidden bias in your AI systems in minutes.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-950 text-white antialiased">
        <AuthProvider>
          <WakeUpPing />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
