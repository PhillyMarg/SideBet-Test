"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";

export default function SignUpPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create Firestore user document
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        joined_groups: [],
        total_stats: { totalBets: 0, wins: 0, losses: 0, net: 0 },
      });

      router.push("/home");
    } catch (err: any) {
      console.error("Signup failed:", err);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <form onSubmit={handleSignUp} className="flex flex-col gap-3 w-80">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-1/2 p-2 rounded bg-zinc-900 border border-zinc-700 text-sm text-white"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-1/2 p-2 rounded bg-zinc-900 border border-zinc-700 text-sm text-white"
          />
        </div>

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-2 rounded bg-zinc-900 border border-zinc-700 text-sm text-white"
        />

        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="p-2 rounded bg-zinc-900 border border-zinc-700 text-sm text-white"
        />

        {error && (
          <p className="text-red-500 text-sm text-center break-words">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <p
        className="text-sm mt-4 text-gray-400 cursor-pointer hover:text-orange-400"
        onClick={() => router.push("/login")}
      >
        Already have an account? Sign In
      </p>
    </main>
  );
}