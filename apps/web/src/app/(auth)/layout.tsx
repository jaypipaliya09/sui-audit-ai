'use client';

import { Shield, Zap, Globe, Lock } from 'lucide-react';
import Link from 'next/link';

const FEATURES = [
  { icon: Shield, text: '14 vulnerability categories' },
  { icon: Zap, text: 'Results in under 60 seconds' },
  { icon: Globe, text: 'Permanent Walrus storage' },
  { icon: Lock, text: 'On-chain audit registry' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Left panel — decorative (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-[#0c0c0e] border-r border-zinc-900 flex-col justify-between p-10 relative overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white text-base">
              SuiAudit<span className="text-indigo-400"> AI</span>
            </span>
          </Link>

          <h2 className="text-2xl font-bold text-white leading-tight mb-3">
            AI-powered security<br />
            for Move contracts
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-sm">
            Get comprehensive security audits in under 60 seconds. Powered by Claude Sonnet 4 with findings stored permanently on Walrus.
          </p>

          <div className="mt-10 space-y-3">
            {FEATURES.map((feat) => (
              <div key={feat.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <feat.icon className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <span className="text-sm text-zinc-400">{feat.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-700 relative z-10">
          © {new Date().getFullYear()} SuiAudit AI
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Mobile logo */}
        <Link href="/" className="flex lg:hidden items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-base">
            SuiAudit<span className="text-indigo-400"> AI</span>
          </span>
        </Link>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
