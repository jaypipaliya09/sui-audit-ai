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

    // Basic hex check
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
    <div className="min-h-screen bg-[#0a0a0a] pt-32 pb-24 selection:bg-indigo-500/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <FadeIn className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-6">
            <Shield className="w-3.5 h-3.5" />
            Sui On-Chain Registry
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Verify an Audit
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Enter a Contract Hash to independently cryptographically verify that it was audited and anchored on the Sui blockchain.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="hash" className="block text-sm font-medium text-gray-300 mb-2">
                Contract Hash (SHA-256)
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="hash"
                  type="text"
                  placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                  value={hash}
                  onChange={(e) => setHash(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-indigo-500/50 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!hash.trim() || isVerifying}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#21262d] disabled:text-gray-500 text-white font-bold rounded-xl transition-all"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Querying Blockchain...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Verify Authenticity
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className={`mt-6 p-6 border rounded-xl animate-in fade-in zoom-in-95 ${
              result.verified 
                ? 'bg-green-500/5 border-green-500/20' 
                : 'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  result.verified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {result.verified ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-bold ${result.verified ? 'text-green-400' : 'text-red-400'}`}>
                    {result.verified ? 'Audit Verified Successfully' : 'Audit Not Found'}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {result.verified 
                      ? 'This contract hash exists in the Sui On-Chain Registry. It was officially audited by MoveAuditor.' 
                      : 'This contract hash was NOT found in the registry. It may be unaudited or tampered with.'}
                  </p>
                </div>
              </div>

              {result.verified && (
                <div className="mt-6 pt-6 border-t border-green-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-500">
                    Verified at: {new Date(result.timestamp).toLocaleString()}
                  </div>
                  <Link
                    href="/"
                    className="text-sm font-semibold text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                  >
                    Start a New Audit <ArrowRight className="w-4 h-4" />
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
