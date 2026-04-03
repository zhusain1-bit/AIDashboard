import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "@/app/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500"]
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: ["400"]
});

export const metadata: Metadata = {
  title: "SignalDesk",
  description: "Stay interview-ready. One brief at a time."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable}`} suppressHydrationWarning>{children}</body>
    </html>
  );
}
