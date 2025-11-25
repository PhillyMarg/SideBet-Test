"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create Firestore user document
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const displayName = `${trimmedFirstName} ${trimmedLastName}`;

      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        displayName: displayName,
        email: email.trim().toLowerCase(),
        joined_groups: [],
        total_stats: { totalBets: 0, wins: 0, losses: 0, net: 0 },
      });

      router.push('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-[#ff6b35] flex flex-col items-center justify-center px-6 py-12">

      {/* Logo */}
      <h1 className="font-montserrat font-bold text-[32px] text-white text-center [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
        SIDEBET
      </h1>

      {/* Tagline */}
      <p className="font-montserrat font-light italic text-[20px] text-white text-center [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] mt-2">
        Every Party Needs Stakes.
      </p>

      {/* Spacer */}
      <div className="h-8" />

      {/* Form */}
      <form onSubmit={handleSignUp} className="w-full max-w-md">

        {/* First Name Label */}
        <p className="font-montserrat font-light italic text-[20px] text-white [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] px-4 mb-2">
          First Name
        </p>

        {/* First Name Input */}
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Phil"
          required
          className="
            w-full h-9 px-3 mb-8
            bg-zinc-900/40
            border-2 border-[#ff6b35]
            rounded-md
            shadow-[2px_2px_4px_0px_#ff6b35]
            text-[#757579] placeholder:text-[#757579]
            font-montserrat text-[14px]
            focus:outline-none focus:border-[#ff6b35]
          "
        />

        {/* Last Name Label */}
        <p className="font-montserrat font-light italic text-[20px] text-white [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] px-4 mb-2">
          Last Name
        </p>

        {/* Last Name Input */}
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="McCracken"
          required
          className="
            w-full h-9 px-3 mb-8
            bg-zinc-900/40
            border-2 border-[#ff6b35]
            rounded-md
            shadow-[2px_2px_4px_0px_#ff6b35]
            text-[#757579] placeholder:text-[#757579]
            font-montserrat text-[14px]
            focus:outline-none focus:border-[#ff6b35]
          "
        />

        {/* Email Label */}
        <p className="font-montserrat font-light italic text-[20px] text-white [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] px-4 mb-2">
          Email Address
        </p>

        {/* Email Input */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="PhilMcCracken@gmail.com"
          required
          className="
            w-full h-9 px-3 mb-8
            bg-zinc-900/40
            border-2 border-[#ff6b35]
            rounded-md
            shadow-[2px_2px_4px_0px_#ff6b35]
            text-[#757579] placeholder:text-[#757579]
            font-montserrat text-[14px]
            focus:outline-none focus:border-[#ff6b35]
          "
        />

        {/* Password Label */}
        <p className="font-montserrat font-light italic text-[20px] text-white [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] px-4 mb-2">
          Password
        </p>

        {/* Password Input */}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="1234567"
          required
          minLength={6}
          className="
            w-full h-9 px-3 mb-12
            bg-zinc-900/40
            border-2 border-[#ff6b35]
            rounded-md
            shadow-[2px_2px_4px_0px_#ff6b35]
            text-[#757579] placeholder:text-[#757579]
            font-montserrat text-[14px]
            focus:outline-none focus:border-[#ff6b35]
          "
        />

        {/* Error Message */}
        {error && (
          <p className="text-red-400 text-sm text-center mb-4 font-montserrat">
            {error}
          </p>
        )}

        {/* Sign Up Button */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full h-9 mb-6
            bg-[rgba(255,107,53,0.52)] hover:bg-[rgba(255,107,53,0.65)]
            rounded-md
            text-white text-[14px] font-montserrat text-center
            [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]
            transition-colors
            disabled:opacity-50
          "
        >
          {loading ? 'CREATING ACCOUNT...' : 'SIGN UP!'}
        </button>

        {/* Login Prompt */}
        <p className="font-montserrat font-light italic text-[14px] text-white text-center [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] mb-3">
          Already been here? Sign in Now!
        </p>

        {/* Sign In Button */}
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="
            w-full h-9
            bg-white/10 hover:bg-white/20
            rounded-md
            text-white text-[14px] font-montserrat text-center
            [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]
            transition-colors
          "
        >
          SIGN IN!
        </button>

      </form>
    </div>
  );
}
