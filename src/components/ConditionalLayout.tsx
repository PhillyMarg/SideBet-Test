"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Hide header/footer on auth pages
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <>
      {!isAuthPage && <Header />}
      <main className="flex-grow">{children}</main>
      {!isAuthPage && <Footer />}
    </>
  );
}