"use client";

import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase/client";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/home");
    } catch (err: any) {
      console.error("Login failed:", err);
      toast.error("Invalid credentials or login error.");
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-2xl font-bold mb-6">Sign In</h1>

      <form onSubmit={handleLogin} className="flex flex-col gap-3 w-80">
        <div>
          <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-base text-white"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-gray-400 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-zinc-900 border border-zinc-700 text-base text-white"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded mt-2"
        >
          Log In
        </button>
      </form>

      {/* Added sign-up link section */}
      <p
        className="text-sm mt-4 text-gray-400 cursor-pointer hover:text-orange-400"
        onClick={() => router.push("/signup")}
      >
        Don’t have an account? Sign Up
      </p>
    </main>
  );
}
