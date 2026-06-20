'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  ShieldCheck, Search, Loader2, CheckCircle2,
  XCircle, AlertTriangle, ArrowRight, Shield
} from 'lucide-react';
import { FadeIn } from '@/components/FadeIn';

export default function VerifyPage() {
  const [hash, setHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{ verified: boolean; timestamp: string } | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash.trim()) return;

    if (!/^[0-9a-fA-F]{64}$/.test(hash.trim())) {
      setError('Please enter a valid 64-character SHA-256 contract hash.');
      setResult(null);
      return;
    }

    setIsVerifying(true);
    setError('');
    setResult(null);

    try {
      const res = await api.verifyAuditOnChain(hash.trim());
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to verify audit on-chain.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian pt-28 pb-20 relative overflow-hidden">
      {/* Ambient glow */}
      <div aria-hidden className="absolute -top-20 left-1/2 -translate-x-1/2 w-[640px] h-[360px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07), transparent 70%)' }} />
      <div aria-hidden className="absolute top-0 inset-x-0 h-px rule-champagne pointer-events-none" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 relative z-10">

        <FadeIn className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-jade-400/20 bg-jade-500/[0.06] text-jade-300 text-xs font-medium mb-5">
            <Shield className="w-3 h-3" />
            Sui On-Chain Registry
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-medium text-ivory tracking-[-0.02em] mb-4">
            Verify an <span className="lux-gradient">Audit</span>
          </h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Enter a Contract Hash to independently verify that it was audited and anchored on the Sui blockchain.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="glass-panel p-5 sm:p-6 shadow-premium-md">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="hash" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Contract Hash (SHA-256)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  id="hash"
                  type="text"
                  placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb924..."
                  value={hash}
                  onChange={(e) => setHash(e.target.value)}
                  className="input-base pl-10 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!hash.trim() || isVerifying}
              className="btn-primary w-full py-2.5 text-xs"
            >
              {isVerifying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Querying Blockchain...</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Verify Authenticity</>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-5 p-3 bg-red-500/8 border border-red-500/15 rounded-lg text-xs text-red-400 flex items-start gap-2 animate-fadeIn">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className={`mt-5 p-5 border rounded-xl animate-fadeIn ${
              result.verified
                ? 'bg-emerald-500/[0.04] border-emerald-500/15'
                : 'bg-red-500/[0.04] border-red-500/15'
            }`}>
              <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  result.verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {result.verified ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${result.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.verified ? 'Audit Verified Successfully' : 'Audit Not Found'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {result.verified
                      ? 'This contract hash exists in the Sui On-Chain Registry.'
                      : 'This contract hash was NOT found in the registry.'}
                  </p>
                </div>
              </div>

              {result.verified && (
                <div className="mt-4 pt-4 border-t border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-600">
                    Verified at: {new Date(result.timestamp).toLocaleString()}
                  </span>
                  <Link
                    href="/"
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    Start New Audit <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </FadeIn>
      </div>
    </div>
  );
}
