import type { Metadata } from "next";
import "./globals.css";
import PWAHead from "../components/PWAHead";
import { Toaster } from "sonner";

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
      <body className="font-sans">
        <PWAHead />
        <main className="min-h-screen bg-[#0a0a0a]">
          {children}
        </main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}