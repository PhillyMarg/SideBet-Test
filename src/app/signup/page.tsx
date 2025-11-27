'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase/client';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      const displayName = `${firstName} ${lastName}`;
      await updateProfile(user, { displayName });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        firstName: firstName,
        lastName: lastName,
        displayName: displayName,
        email: email,
        createdAt: new Date().toISOString(),
      });

      // Redirect to onboarding or home
      router.push('/home');
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Failed to create account. Please try again.');
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

        {/* Signup Form */}
        <form onSubmit={handleSignUp} className="space-y-6">
          {/* First Name */}
          <div>
            <label className="block text-[12px] italic text-white/70 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Phil"
              className="w-full h-12 px-4 bg-transparent border-2 border-[#ff6b35] rounded-lg text-[14px] text-white placeholder-white/40 focus:outline-none focus:border-[#ff8c5c]"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-[12px] italic text-white/70 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="McCracken"
              className="w-full h-12 px-4 bg-transparent border-2 border-[#ff6b35] rounded-lg text-[14px] text-white placeholder-white/40 focus:outline-none focus:border-[#ff8c5c]"
            />
          </div>

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

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#ff6b35] hover:bg-[#ff8c5c] disabled:bg-[#ff6b35]/50 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-lg transition-colors"
          >
            {loading ? 'CREATING ACCOUNT...' : 'SIGN UP!'}
          </button>

          {/* Sign In Link */}
          <div className="text-center space-y-3">
            <p className="text-[12px] italic text-white/70">
              Already been here? Sign in Now!
            </p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full h-12 bg-white/10 hover:bg-white/20 text-white text-[14px] font-semibold rounded-lg transition-colors border border-white/20"
            >
              SIGN IN!
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
