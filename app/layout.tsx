import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelStream – Pharmacovigilance Intelligence Platform",
  description: "Real-time social listening and safety-signal detection for patient safety",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
