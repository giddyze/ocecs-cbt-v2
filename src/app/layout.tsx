import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OCECS CBT Examination Platform",
    template: "%s — OCECS CBT"
  },
  description:
    "Okesanjo Continuing Education & Community Support — Computer-Based Test platform for staff and students.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0F2A4A"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
