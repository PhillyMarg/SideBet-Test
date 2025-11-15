import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PWAHead from "../components/PWAHead";
import ToastProvider from "../components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SideBet - Social Betting for Friends",
  description: "Create and join bets with your friends",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PWAHead />
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}