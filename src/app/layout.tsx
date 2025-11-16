import type { Metadata } from "next";
import "./globals.css";
import PWAHead from "../components/PWAHead";
import Header from "../components/Header";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { PerformanceMonitor } from "../components/PerformanceMonitor";

export const metadata: Metadata = {
  title: "SideBet - Social Betting for Friends",
  description: "Create and join bets with your friends",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ErrorBoundary>
          <PerformanceMonitor />
          <PWAHead />
          <Header />
          <main className="min-h-screen bg-black">
            {children}
          </main>
        </ErrorBoundary>
      </body>
    </html>
  );
}