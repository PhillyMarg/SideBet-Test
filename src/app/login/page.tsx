'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/home');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e1e1e] via-[#2a1810] to-[#ff6b35] flex items-center justify-center p-6 font-montserrat">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-[32px] font-bold text-white tracking-wider mb-2">
            SIDEBET
          </h1>
          <p className="text-[14px] italic text-white/80">
            Every Party Needs Stakes.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSignIn} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-[12px] italic text-white/70 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="PhilMcCracken@gmail.com"
              className="w-full h-12 px-4 bg-transparent border-2 border-[#ff6b35] rounded-lg text-[14px] text-white placeholder-white/40 focus:outline-none focus:border-[#ff8c5c]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[12px] italic text-white/70 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="1234567"
              className="w-full h-12 px-4 bg-transparent border-2 border-[#ff6b35] rounded-lg text-[14px] text-white placeholder-white/40 focus:outline-none focus:border-[#ff8c5c]"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-[12px] text-red-400 text-center">{error}</p>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-lg transition-colors border border-white/20"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN!'}
          </button>

          {/* Sign Up Link */}
          <div className="text-center space-y-3">
            <p className="text-[12px] italic text-white/70">
              Late to the Party? Create an Account Now!
            </p>
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="w-full h-12 bg-[#ff6b35] hover:bg-[#ff8c5c] text-white text-[14px] font-semibold rounded-lg transition-colors"
            >
              SIGN UP!
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
