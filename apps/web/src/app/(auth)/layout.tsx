'use client';

import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-purple-600/8 rounded-full blur-[100px]" />
      </div>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-white text-xl tracking-tight">
          Sui<span className="text-indigo-400">Audit</span> AI
        </span>
      </Link>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl shadow-black/50">
          {children}
        </div>
      </div>

      {/* Footer text */}
      <p className="relative z-10 mt-8 text-xs text-gray-600">
        © {new Date().getFullYear()} SuiAudit AI. All rights reserved.
      </p>
    </div>
  );
}
