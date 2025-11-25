"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-[#ff6b35] flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <h1 className="font-montserrat font-bold text-[32px] text-white text-center [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]">
        SIDEBET
      </h1>

      {/* Tagline */}
      <p className="font-montserrat font-light italic text-[20px] text-white text-center [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] mt-2">
        Every Party Needs Stakes.
      </p>

      {/* Spacer */}
      <div className="h-16" />

      {/* Form */}
      <form onSubmit={handleSignIn} className="w-full max-w-md">

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

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full h-9 mb-6
            bg-white/10 hover:bg-white/20
            rounded-md
            text-white text-[14px] font-montserrat text-center
            [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]
            transition-colors
            disabled:opacity-50
          "
        >
          {loading ? 'SIGNING IN...' : 'SIGN IN!'}
        </button>

        {/* Signup Prompt */}
        <p className="font-montserrat font-light italic text-[14px] text-white text-center [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px] mb-3">
          Late to the Party? Create an Account Now!
        </p>

        {/* Sign Up Button */}
        <button
          type="button"
          onClick={() => router.push('/signup')}
          className="
            w-full h-9
            bg-[rgba(255,107,53,0.52)] hover:bg-[rgba(255,107,53,0.65)]
            rounded-md
            text-white text-[14px] font-montserrat text-center
            [text-shadow:rgba(0,0,0,0.25)_0px_4px_4px]
            transition-colors
          "
        >
          SIGN UP!
        </button>

      </form>
    </div>
  );
}
