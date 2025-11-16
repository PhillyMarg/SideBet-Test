import type { Metadata } from "next";
import "./globals.css";
import PWAHead from "../components/PWAHead";
import Header from "../components/Header";

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
        <Header />
        <main className="min-h-screen bg-black">
          {children}
        </main>
      </body>
    </html>
  );
}