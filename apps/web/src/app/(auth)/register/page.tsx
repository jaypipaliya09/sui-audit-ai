'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Loader2, Mail, Lock, User, Eye, EyeOff, Wallet, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-gray-400 text-sm mb-6">
          We&apos;ve sent a verification link to <span className="text-white font-medium">{email}</span>.
          Please check your inbox and click the link to verify your account.
        </p>
        <Link
          href="/login"
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
        >
          Go to Login →
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
      <p className="text-gray-500 text-sm mb-8">Start auditing Sui Move contracts in seconds.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-indigo-500/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-indigo-500/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-indigo-500/50 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-indigo-500/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[#2a2a2a]" />
        <span className="text-xs text-gray-600">or continue with</span>
        <div className="flex-1 h-px bg-[#2a2a2a]" />
      </div>

      {/* Sui Wallet */}
      <button
        onClick={() => router.push('/')}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#3a3a3a] text-gray-300 hover:text-white font-medium rounded-xl transition-all text-sm"
      >
        <Wallet className="w-4 h-4" />
        Sign in with Sui Wallet
      </button>

      <p className="text-center text-sm text-gray-600 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </>
  );
}
