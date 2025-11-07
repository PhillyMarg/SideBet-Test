"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.push("/home");
  }, [router]);

  return (
    <main className="flex items-center justify-center h-screen">
      <p>Redirecting to home...</p>
    </main>
  );
}
