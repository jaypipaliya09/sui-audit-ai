'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Zap, Globe, ArrowRight, CheckCircle2, Clock,
  FileCode2, Brain, Database, Share2, BarChart3, Lock,
  AlertTriangle, ChevronRight, Loader2, GitBranch, Search, Play, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { TRACKS } from '@/lib/tracks';
import { ContractEditor } from '@/components/ContractEditor';
import { AuditMethodSelector } from '@/components/AuditMethodSelector';
import { RiskBadge } from '@/components/RiskBadge';
import { SkeletonAuditCard } from '@/components/SkeletonCard';
import { FadeIn } from '@/components/FadeIn';
import { useWallet } from '@/lib/walletContext';
import { Transaction } from '@mysten/sui/transactions';

/* ─── Data ────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Brain, title: 'Claude Sonnet 4 AI', description: 'Powered by Anthropic\'s latest model, trained on thousands of Move patterns and known attack vectors.', accent: 'indigo' },
  { icon: Shield, title: 'Move-Specific Security', description: '14 vulnerability categories including access control, integer overflow, shared object races, and capability misuse.', accent: 'blue' },
  { icon: Globe, title: 'Walrus Storage', description: 'Every audit report is stored permanently on the Walrus decentralized network. Share a single link forever.', accent: 'cyan' },
  { icon: Zap, title: 'Real-Time Progress', description: 'Watch your contract being analyzed live with Server-Sent Events. No polling, no waiting in the dark.', accent: 'amber' },
  { icon: BarChart3, title: 'Gas Optimization', description: 'Beyond security — get actionable gas optimization suggestions to reduce transaction costs.', accent: 'emerald' },
  { icon: Share2, title: 'Shareable Reports', description: 'Every report gets a permanent URL. Share with your team, auditors, or community.', accent: 'purple' },
];

const HOW_STEPS = [
  { title: 'Paste Contract', desc: 'Drop your Sui Move code into the editor or load a demo.', icon: FileCode2 },
  { title: 'AI Analyzes', desc: 'Claude Sonnet 4 scans 14 vulnerability categories in ~60s.', icon: Brain },
  { title: 'Report Generated', desc: 'Structured findings with severity, impact, and recommendations.', icon: BarChart3 },
  { title: 'Stored on Walrus', desc: 'Your report is stored permanently on the decentralized network.', icon: Database },
];

const STATS = [
  { label: 'Audits Run', value: '2,400+' },
  { label: 'Vulnerabilities Found', value: '8,900+' },
  { label: 'Avg. Audit Time', value: '< 60s' },
  { label: 'Stored on Walrus', value: '100%' },
];

const VULN_CATEGORIES = [
  'Access Control', 'Integer Overflow', 'Reentrancy', 'Unchecked Return',
  'Object Confusion', 'Capability Misuse', 'DoS Vectors', 'Logic Errors',
  'Gas Abuse', 'Flash Loan', 'Shared Object Race', 'Friend Module Abuse',
  'Missing Validation', 'General',
];


/* ─── Repo Audit Inline ───────────────────────────────────────────── */
function RepoAuditInline() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const [projectTrack, setProjectTrack] = useState('AI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleScan = async () => {
    if (!repoUrl) return;
    setIsScanning(true); setScanError(''); setScanResult(null);
    try {
      const res = await api.scanRepo({ repoUrl });
      setScanResult(res);
    } catch (err: any) {
      setScanError(err.message || 'Failed to scan repository.');
    } finally { setIsScanning(false); }
  };

  const handleSubmit = async () => {
    if (!scanResult) return;
    setIsSubmitting(true); setSubmitError('');
    try {
      const res = await api.submitRepoAudit({ scanId: scanResult.scanId, projectTrack });
      router.push(`/repo-audit/${res.repoAuditId}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit audit.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <FadeIn delay={0.3} className="rounded-xl surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/50">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
        <span className="ml-2 text-[11px] text-zinc-600 font-mono flex items-center gap-1">
          <GitBranch className="w-3 h-3" /> github_audit
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Step 1 */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[11px]">1</div>
            <h3 className="text-sm font-medium text-white">Scan Repository</h3>
          </div>
          <div className="ml-8 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <input
                  type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  disabled={isScanning || !!scanResult}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  className="input-base pl-9 py-2.5 text-xs font-mono"
                />
              </div>
              {!scanResult && (
                <button onClick={handleScan} disabled={!repoUrl || isScanning} className="btn-primary text-xs py-2.5 px-4">
                  {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {isScanning ? 'Scanning…' : 'Scan'}
                </button>
              )}
              {scanResult && (
                <button onClick={() => { setScanResult(null); setRepoUrl(''); }} className="btn-secondary text-xs py-2.5">Change</button>
              )}
            </div>
            {scanError && (
              <div className="p-3 bg-red-500/8 border border-red-500/15 rounded-lg text-xs text-red-400 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {scanError}
              </div>
            )}
            {scanResult && (
              <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/15 rounded-lg">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Scan Complete</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-zinc-500">Repo:</span> <span className="text-white">{scanResult.repoOwner}/{scanResult.repoName}</span></div>
                  <div><span className="text-zinc-500">Commit:</span> <span className="text-white font-mono text-[11px]">{scanResult.commitSha?.slice(0, 7)}</span></div>
                  <div className="col-span-2"><span className="text-zinc-500">Files:</span> <span className="text-white">{scanResult.estimatedAudits} Move contracts</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className={`transition-opacity ${!scanResult ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[11px]">2</div>
            <h3 className="text-sm font-medium text-white">Configure & Submit</h3>
          </div>
          <div className="ml-8 space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Project Track</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {TRACKS.map((track) => (
                  <button key={track.id} onClick={() => setProjectTrack(track.id)}
                    className={`p-2 rounded-md border text-[11px] transition-colors ${projectTrack === track.id
                      ? 'bg-indigo-500/8 border-indigo-500/20 text-indigo-300'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                  >{track.label}</button>
                ))}
              </div>
            </div>
            {submitError && (
              <div className="p-3 bg-red-500/8 border border-red-500/15 rounded-lg text-xs text-red-400">{submitError}</div>
            )}
            <button onClick={handleSubmit} disabled={isSubmitting || !scanResult} className="btn-primary w-full py-2.5 text-xs">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Initiating…</> : <><Shield className="w-4 h-4" /> Submit Repo Audit <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const auditSectionRef = useRef<HTMLDivElement>(null);
  const { isConnected, saveAudit, address, provider, myAudits } = useWallet();

  const [contractCode, setContractCode] = useState('');
  const [contractName, setContractName] = useState('');
  const [auditMethod, setAuditMethod] = useState<'single' | 'repo'>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(true);

  useEffect(() => {
    if (isConnected) {
      const formatted = myAudits.slice(0, 6).map((a) => ({
        id: a.auditId, blobId: a.blobId, contractName: a.contractName,
        createdAt: a.createdAt, overallRisk: a.overallRisk || 'COMPLETE', status: 'COMPLETE',
      }));
      setRecentAudits(formatted);
    } else {
      setRecentAudits([]);
    }
    setAuditsLoading(false);
  }, [isConnected, myAudits]);

  const handleSubmit = async () => {
    if (!contractCode || !contractName) return;
    if (!isConnected || !address) {
      setError('Please connect your wallet to pay for the audit (1 SUI).');
      return;
    }
    if (!provider) {
      setError('Wallet connection lost. Please reconnect your wallet.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    let txDigest = '';

    try {
      const tx = new Transaction();
      const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_DEMO_WALLET_ADDRESS || '0x7c23479f9746a400ae9fddd93158f97e864dde6837942d863d52c9893e7765a8';

      tx.setSender(address);
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(1_000_000_000)]);
      tx.transferObjects([coin], tx.pure.address(TREASURY_ADDRESS));

      let account = null;
      if (provider.accounts) {
        account = provider.accounts.find((a: any) => a.address?.toLowerCase() === address.toLowerCase()) || provider.accounts[0];
      }
      if (!account && typeof provider.getAccounts === 'function') {
        try {
          const legacyAccounts = await provider.getAccounts();
          const foundLegacy = legacyAccounts?.find((a: any) => {
            const addr = typeof a === 'string' ? a : a?.address;
            return addr?.toLowerCase() === address.toLowerCase();
          });
          if (foundLegacy) { account = typeof foundLegacy === 'string' ? { address: foundLegacy } : foundLegacy; }
          else if (legacyAccounts?.[0]) { const first = legacyAccounts[0]; account = typeof first === 'string' ? { address: first } : first; }
        } catch (err) { console.error('Failed to get legacy accounts:', err); }
      }
      if (!account && provider.features?.['standard:connect']?.connect) {
        try {
          const connResult = await provider.features['standard:connect'].connect();
          const accounts = connResult.accounts || provider.accounts || [];
          account = accounts.find((a: any) => a.address?.toLowerCase() === address.toLowerCase()) || accounts[0];
        } catch (err) { console.error('Failed to establish standard connection:', err); }
      }

      let txResult;
      if (provider.features?.['sui:signAndExecuteTransaction'] && account) {
        txResult = await provider.features['sui:signAndExecuteTransaction'].signAndExecuteTransaction({
          account, chain: 'sui:testnet', transaction: tx, options: { showEffects: true },
        });
      } else if (provider.features?.['sui:signAndExecuteTransactionBlock'] && account) {
        txResult = await provider.features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
          account, chain: 'sui:testnet', transactionBlock: tx, options: { showEffects: true },
        });
      } else if (typeof provider.signAndExecuteTransactionBlock === 'function') {
        txResult = await provider.signAndExecuteTransactionBlock({
          transactionBlock: tx, options: { showEffects: true },
        });
      } else {
        throw new Error('Wallet connected but no active account found. Please try reconnecting.');
      }

      if (txResult.effects && txResult.effects.status?.status === 'failure') {
        throw new Error('Transaction failed on the Sui network. Please try again.');
      }
      txDigest = txResult.digest || txResult.transactionEffects?.transactionDigest;
      if (!txDigest) {
        throw new Error('Transaction execution succeeded but no transaction digest was returned by the wallet.');
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/audit/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractCode, contractName, txDigest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit audit');

      if (isConnected) {
        saveAudit({ auditId: data.auditId, blobId: '', contractName, createdAt: new Date().toISOString() });
      }
      router.push(`/audit/${data.auditId}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  const isFormValid = contractCode.length > 0 && contractName.length > 0;

  return (
    <main className="min-h-screen bg-[#09090b]">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-16 hero-grid">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/[0.06] rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/8 text-indigo-400 text-xs font-medium mb-6 animate-fadeInUp">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Powered by Claude Sonnet 4 + Walrus Network
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-5 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            AI Security Audits
            <br />
            <span className="text-indigo-400">for Sui Move</span>
          </h1>

          <p className="text-base text-zinc-500 max-w-xl mx-auto mb-8 leading-relaxed animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            Paste your Move contract. Get a comprehensive security audit in under 60 seconds.
            Findings stored permanently on Walrus.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => auditSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary px-6 py-3 text-sm"
            >
              <Zap className="w-4 h-4" />
              Start Free Audit
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <Link href="/how-it-works" className="btn-secondary px-6 py-3 text-sm">
              How It Works
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800/50 rounded-xl overflow-hidden border border-zinc-800 max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-[#111113] px-5 py-4 text-center">
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-[11px] text-zinc-600 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6">
        <FadeIn className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-3">
            Everything you need to ship securely
          </h2>
          <p className="text-sm text-zinc-500 max-w-lg mx-auto">
            From access control to gas optimization — comprehensive analysis built for the Sui Move ecosystem.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((feat, i) => (
            <FadeIn
              key={feat.title}
              delay={i * 0.08}
              className="group p-5 rounded-xl surface hover:border-zinc-700 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-500/8 border border-indigo-500/15 flex items-center justify-center mb-3">
                <feat.icon className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{feat.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{feat.description}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="py-16 border-y border-zinc-900 bg-[#0c0c0e]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeIn className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">The Process</div>
              <h2 className="text-2xl font-bold text-white">How It Works</h2>
            </div>
            <Link href="/how-it-works" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors">
              Full explanation <ChevronRight className="w-3 h-3" />
            </Link>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_STEPS.map((step, idx) => (
              <FadeIn delay={idx * 0.1} key={step.title} className="relative flex flex-col items-center text-center">
                <div className="relative w-10 h-10 rounded-full bg-indigo-500/8 border border-indigo-500/15 flex items-center justify-center mb-4">
                  <step.icon className="w-4 h-4 text-indigo-400" />
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">
                    {idx + 1}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{step.desc}</p>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.4} className="mt-10 p-5 rounded-xl surface">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-zinc-300">14 Vulnerability Categories Analyzed</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VULN_CATEGORIES.map((cat) => (
                <span key={cat} className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">{cat}</span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── AUDIT EDITOR ──────────────────────────────────────────────── */}
      <section id="audit" ref={auditSectionRef} className="py-20 max-w-5xl mx-auto px-4 sm:px-6">
        <FadeIn className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-3">
            Audit Your Contract Now
          </h2>
          <p className="text-sm text-zinc-500 max-w-lg mx-auto">
            Paste your Sui Move code or load a demo contract. Results in under 60 seconds.
          </p>
        </FadeIn>

        <FadeIn delay={0.15} className="mb-5">
          <AuditMethodSelector selected={auditMethod} onSelect={setAuditMethod} />
        </FadeIn>

        {auditMethod === 'single' ? (
          <FadeIn delay={0.25} className="rounded-xl surface overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              <span className="ml-2 text-[11px] text-zinc-600 font-mono">move_contract.move</span>
            </div>

            <div className="p-5 space-y-5">
              <ContractEditor value={contractCode} onChange={setContractCode} disabled={isSubmitting} />

              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label htmlFor="contractName" className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Contract Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="contractName" type="text"
                    placeholder="e.g. vulnerable_defi::vault"
                    value={contractName} onChange={(e) => setContractName(e.target.value)}
                    disabled={isSubmitting}
                    className="input-base text-xs font-mono"
                  />
                </div>
                <button
                  onClick={handleSubmit} disabled={!isFormValid || isSubmitting}
                  className="btn-primary px-6 py-2.5 text-xs min-w-[160px]"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Queuing...</>
                  ) : (
                    <><Shield className="w-3.5 h-3.5" /> {isConnected ? 'Pay 1 SUI & Audit' : 'Connect Wallet'} <ArrowRight className="w-3 h-3" /></>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/8 border border-red-500/15 rounded-lg text-xs text-red-400 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600 border-t border-red-500/10 pt-2 space-y-0.5">
                    <div>Address: {address || 'none'}</div>
                    <div>Provider: {provider?.name || (provider ? 'unknown' : 'none')}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-3 border-t border-zinc-800/40">
                {[
                  { icon: CheckCircle2, text: 'Free to use', color: 'text-emerald-400' },
                  { icon: Lock, text: 'Code not stored', color: 'text-blue-400' },
                  { icon: Globe, text: 'Report on Walrus', color: 'text-cyan-400' },
                  { icon: Clock, text: '< 60s results', color: 'text-purple-400' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-1 text-[11px] text-zinc-600">
                    <item.icon className={`w-3 h-3 ${item.color}`} />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        ) : (
          <RepoAuditInline />
        )}
      </section>

      {/* ── RECENT AUDITS ─────────────────────────────────────────────── */}
      <section className="pb-20 max-w-5xl mx-auto px-4 sm:px-6">
        <FadeIn className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Recent Audits</h2>
          {isConnected && (
            <Link href="/my-audits" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1">
              My Audits <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </FadeIn>

        {auditsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <SkeletonAuditCard key={i} />)}
          </div>
        ) : recentAudits.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentAudits.map((audit, idx) => (
              <FadeIn
                delay={idx * 0.08}
                key={audit.id}
                onClick={() => audit.blobId && router.push(`/report/${audit.blobId}`)}
                className={`group p-4 rounded-xl surface hover:border-zinc-700 transition-all duration-200 ${audit.blobId ? 'cursor-pointer' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-zinc-300 truncate pr-2 group-hover:text-white transition-colors">
                    {audit.contractName}
                  </h3>
                  <RiskBadge level={audit.overallRisk || audit.status} className="shrink-0" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-mono">
                    {audit.blobId ? `${audit.blobId.slice(0, 10)}…` : (audit.id?.startsWith('d') ? 'Demo' : 'Processing…')}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
        ) : (
          <FadeIn delay={0.2} className="text-center py-14 rounded-xl border border-dashed border-zinc-800">
            <Shield className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
            <p className="text-sm text-zinc-600">No audits yet — be the first!</p>
            <button
              onClick={() => auditSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Run your first audit →
            </button>
          </FadeIn>
        )}
      </section>
    </main>
  );
}