'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Loader2, Mail, Lock, Eye, EyeOff, Wallet } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
      <p className="text-gray-500 text-sm mb-8">Sign in to your MoveAuditor account.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-400">Password</label>
            <Link href="/login" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-indigo-500/50 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
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
          {isLoading ? 'Signing in...' : 'Sign In'}
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
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </>
  );
}
