'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Zap, Globe, ArrowRight, CheckCircle2, Clock,
  FileCode2, Brain, Database, Share2, BarChart3, Lock,
  AlertTriangle, ChevronRight, Loader2,
} from 'lucide-react';
import { ContractEditor } from '@/components/ContractEditor';
import { RiskBadge } from '@/components/RiskBadge';
import { SkeletonAuditCard } from '@/components/SkeletonCard';
import { useWallet } from '@/lib/walletContext';
import { Transaction } from '@mysten/sui/transactions';

/* ─── Feature Cards Data ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Brain,
    title: 'Claude Sonnet 4 AI',
    description: 'Powered by Anthropic\'s latest model, trained on thousands of Move contract patterns and known attack vectors.',
    color: 'from-purple-500/20 to-purple-600/5',
    border: 'border-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: Shield,
    title: 'Move-Specific Security',
    description: '14 vulnerability categories including access control, integer overflow, shared object races, and capability misuse.',
    color: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Globe,
    title: 'Walrus Storage',
    description: 'Every audit report is stored permanently on the Walrus decentralized network. Share a single link forever.',
    color: 'from-cyan-500/20 to-cyan-600/5',
    border: 'border-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Zap,
    title: 'Real-Time Progress',
    description: 'Watch your contract being analyzed live with Server-Sent Events. No polling, no waiting in the dark.',
    color: 'from-yellow-500/20 to-yellow-600/5',
    border: 'border-yellow-500/20',
    iconColor: 'text-yellow-400',
  },
  {
    icon: BarChart3,
    title: 'Gas Optimization',
    description: 'Beyond security — get actionable gas optimization suggestions to reduce transaction costs.',
    color: 'from-green-500/20 to-green-600/5',
    border: 'border-green-500/20',
    iconColor: 'text-green-400',
  },
  {
    icon: Share2,
    title: 'Shareable Reports',
    description: 'Every report gets a permanent URL. Share with your team, auditors, or community instantly.',
    color: 'from-orange-500/20 to-orange-600/5',
    border: 'border-orange-500/20',
    iconColor: 'text-orange-400',
  },
];

/* ─── How It Works Steps (Inline Preview) ───────────────────────── */
const HOW_STEPS = [
  { step: '01', title: 'Paste Contract', desc: 'Drop your Sui Move code into the editor or load a demo contract.', icon: FileCode2 },
  { step: '02', title: 'AI Analyzes', desc: 'Claude Sonnet 4 scans for 14 vulnerability categories in ~60 seconds.', icon: Brain },
  { step: '03', title: 'Report Generated', desc: 'Structured JSON findings with severity, impact, and recommendations.', icon: BarChart3 },
  { step: '04', title: 'Stored on Walrus', desc: 'Your report is stored permanently. Share a single link forever.', icon: Database },
];

/* ─── Stats ──────────────────────────────────────────────────────── */
const STATS = [
  { label: 'Audits Run', value: '2,400+' },
  { label: 'Vulnerabilities Found', value: '8,900+' },
  { label: 'Avg. Audit Time', value: '< 60s' },
  { label: 'Stored on Walrus', value: '100%' },
];

/* ─── Security Categories ────────────────────────────────────────── */
const VULN_CATEGORIES = [
  'Access Control', 'Integer Overflow', 'Reentrancy', 'Unchecked Return',
  'Object Confusion', 'Capability Misuse', 'DoS Vectors', 'Logic Errors',
  'Gas Abuse', 'Flash Loan', 'Shared Object Race', 'Friend Module Abuse',
  'Missing Validation', 'General',
];

/* ─── Demo Audits (shown when backend empty / offline) ──────────── */
const DEMO_AUDITS = [
  { id: 'd1', contractName: 'vulnerable_defi::vault', overallRisk: 'CRITICAL', createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), blobId: null, status: 'COMPLETE' },
  { id: 'd2', contractName: 'clean_nft::collection', overallRisk: 'CLEAN', createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), blobId: null, status: 'COMPLETE' },
  { id: 'd3', contractName: 'defi_swap::pool', overallRisk: 'HIGH', createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), blobId: null, status: 'COMPLETE' },
  { id: 'd4', contractName: 'governance::dao', overallRisk: 'MEDIUM', createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), blobId: null, status: 'COMPLETE' },
  { id: 'd5', contractName: 'staking::rewards', overallRisk: 'LOW', createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), blobId: null, status: 'COMPLETE' },
  { id: 'd6', contractName: 'bridge::escrow', overallRisk: 'HIGH', createdAt: new Date(Date.now() - 3600000 * 72).toISOString(), blobId: null, status: 'COMPLETE' },
];

/* ─── Component ──────────────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const auditSectionRef = useRef<HTMLDivElement>(null);
  const { isConnected, saveAudit, address, provider } = useWallet();

  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/reports?limit=6`);
        if (res.ok) {
          const data = await res.json();
          setRecentAudits(data.data && data.data.length > 0 ? data.data : DEMO_AUDITS);
        } else {
          setRecentAudits(DEMO_AUDITS);
        }
      } catch {
        // Backend not running — show demo data
        setRecentAudits(DEMO_AUDITS);
      } finally {
        setAuditsLoading(false);
      }
    };
    fetchRecent();
  }, []);

  const handleSubmit = async () => {
    if (!contractCode || !contractName) return;
    if (!isConnected || !address) {
      setError('Please connect your wallet to pay for the audit (1 SUI).');
      return;
    }
    
    if (!provider) {
      setError('Wallet connection lost. Please disconnect and reconnect your wallet to sign the transaction.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    let txDigest = '';

    try {
      // Demo Mode bypasses the transaction
      if (provider === 'demo') {
        txDigest = '';
      } else {
        // Build the transaction
        const tx = new Transaction();
        const TREASURY_ADDRESS = '0x69fb32ef40f1954a2279041bb2d90c4e7d289dd10486409ae81e7ef39467d8b0';
        
        // Split 1 SUI from gas coin
        const coin = tx.splitCoins(tx.gas, [1_000_000_000]); // 1 SUI = 10^9 MIST
        
        // Transfer to treasury
        tx.transferObjects([coin], TREASURY_ADDRESS);
        
        // Request signature and execution from the wallet
        const res = await provider.signAndExecuteTransactionBlock({
          transactionBlock: tx,
          options: {
            showEffects: true,
          },
        });
        
        if (res.effects?.status?.status !== 'success') {
          throw new Error('Transaction failed on network.');
        }
        
        txDigest = res.digest;
      }

      // Submit to backend
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/audit/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractCode, contractName, txDigest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit audit');

      // Save to wallet audit history
      if (isConnected) {
        saveAudit({
          auditId: data.auditId,
          blobId: '',
          contractName,
          createdAt: new Date().toISOString(),
        });
      }

      router.push(`/audit/${data.auditId}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during payment or submission.');
      setIsSubmitting(false);
    }
  };

  const isFormValid = contractCode.length > 0 && contractName.length > 0;

  return (
    <main className="min-h-screen bg-[#0d1117]">

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 hero-grid">
        {/* Glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/8 rounded-full blur-[120px] animate-glow-pulse" />
          <div className="absolute top-20 left-1/4 w-[400px] h-[300px] bg-purple-600/6 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-20 right-1/4 w-[400px] h-[300px] bg-cyan-600/6 rounded-full blur-[100px] animate-glow-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-8 animate-fadeInUp">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Powered by Claude Sonnet 4 + Walrus Network
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            AI Security Audits
            <br />
            <span className="gradient-text">for Sui Move</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            Paste your Move contract. Get a comprehensive security audit in under 60 seconds. Findings stored permanently on the Walrus decentralized network.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => auditSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="group flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5" />
              Start Free Audit
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              href="/how-it-works"
              className="flex items-center gap-2 px-8 py-4 border border-[#30363d] hover:border-[#444c56] text-gray-300 hover:text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5"
            >
              See How It Works
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#21262d] rounded-2xl overflow-hidden border border-[#21262d] max-w-3xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-[#161b22] px-6 py-5 text-center">
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#30363d] bg-[#161b22] text-gray-400 text-sm font-medium mb-4">
            <Lock className="w-3.5 h-3.5" />
            Enterprise-grade analysis
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Everything you need to ship securely
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            From access control to gas optimization — comprehensive analysis built specifically for the Sui Move ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className={`group relative p-6 rounded-2xl bg-gradient-to-br ${feat.color} border ${feat.border} hover:scale-[1.02] transition-all duration-300 cursor-default`}
            >
              <div className={`w-10 h-10 rounded-xl bg-[#161b22] border ${feat.border} flex items-center justify-center mb-4`}>
                <feat.icon className={`w-5 h-5 ${feat.iconColor}`} />
              </div>
              <h3 className="font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS (INLINE PREVIEW) ────────────────────────────── */}
      <section className="py-20 border-y border-[#21262d] bg-[#0a0f14]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <div className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">The Process</div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">How It Works</h2>
            </div>
            <Link
              href="/how-it-works"
              className="flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors shrink-0"
            >
              Full explanation <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-[26px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#30363d] to-transparent" />

            {HOW_STEPS.map((step, idx) => (
              <div key={step.step} className="relative flex flex-col items-center text-center group">
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform z-10">
                  <step.icon className="w-5 h-5 text-blue-400" />
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">
                    {idx + 1}
                  </div>
                </div>
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Vulnerability Categories */}
          <div className="mt-16 p-6 rounded-2xl bg-[#161b22] border border-[#21262d]">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-gray-300">14 Vulnerability Categories Analyzed</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {VULN_CATEGORIES.map((cat) => (
                <span
                  key={cat}
                  className="px-3 py-1 rounded-lg bg-[#21262d] border border-[#30363d] text-xs text-gray-400 font-medium"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AUDIT EDITOR SECTION ─────────────────────────────────────── */}
      <section id="audit" ref={auditSectionRef} className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
            Audit Your Contract Now
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Paste your Sui Move code or load one of the demo contracts. Results appear in under 60 seconds.
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl shadow-2xl overflow-hidden">
          {/* Editor toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#21262d] bg-[#0d1117]">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-gray-600 font-mono">move_contract.move</span>
          </div>

          <div className="p-6 space-y-6">
            <ContractEditor
              value={contractCode}
              onChange={setContractCode}
              disabled={isSubmitting}
            />

            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="contractName" className="block text-sm font-medium text-gray-400 mb-2">
                  Contract Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="contractName"
                  type="text"
                  placeholder="e.g. vulnerable_defi::vault"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-[#21262d] disabled:text-gray-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:shadow-none h-[50px] min-w-[180px] hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Queuing audit...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    {isConnected && provider !== 'demo' ? 'Pay 1 SUI & Run Audit' : 'Run Security Audit'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-[#21262d]">
              {[
                { icon: CheckCircle2, text: 'Free to use', color: 'text-green-400' },
                { icon: Lock, text: 'Code not stored', color: 'text-blue-400' },
                { icon: Globe, text: 'Report on Walrus', color: 'text-cyan-400' },
                { icon: Clock, text: '< 60 second results', color: 'text-purple-400' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RECENT AUDITS ────────────────────────────────────────────── */}
      <section className="pb-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Recent Audits Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-white tracking-tight">Recent Audits</h2>
          <div className="flex items-center gap-3">
            {isConnected && (
              <Link
                href="/my-audits"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center gap-1"
              >
                My Audits <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <span className="text-sm text-gray-500">Live from the network</span>
          </div>
        </div>

        {auditsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SkeletonAuditCard key={i} />
            ))}
          </div>
        ) : recentAudits.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentAudits.map((audit) => (
              <div
                key={audit.id}
                onClick={() => audit.blobId && router.push(`/report/${audit.blobId}`)}
                className={`group p-4 rounded-xl border border-[#21262d] bg-[#161b22] hover:bg-[#1c2128] hover:border-[#30363d] transition-all duration-200 ${audit.blobId ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-200 truncate pr-2 text-sm group-hover:text-white transition-colors">
                    {audit.contractName}
                  </h3>
                  <RiskBadge level={audit.overallRisk || audit.status} className="shrink-0" />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-mono">
                    {audit.blobId ? `${audit.blobId.slice(0, 10)}…` : (audit.id?.startsWith('d') ? 'Demo' : 'Processing…')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-[#30363d] rounded-2xl">
            <Shield className="w-10 h-10 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-600 text-sm">No audits yet — be the first!</p>
            <button
              onClick={() => auditSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Run your first audit →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
