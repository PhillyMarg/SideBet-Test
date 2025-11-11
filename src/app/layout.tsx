import "./globals.css";
import { Inter } from "next/font/google";
import ConditionalLayout from "../components/ConditionalLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SideBet",
  description: "Friendly wagers with friends — no money, just bragging rights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gray-950 text-white flex flex-col min-h-screen`}
      >
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}