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
import { Hero } from '@/components/Hero';
import { Reveal, SectionHeading, SpotlightCard, ScrollProgress, Divider, IntroOverlay, CustomCursor } from '@/components/home/HomeUI';
import { motion } from 'framer-motion';
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
  { title: 'Input Source Code', desc: 'Paste a Move module or scan a GitHub repository.', icon: FileCode2 },
  { title: 'Repo Compilation', desc: 'Repositories are cloned and compiled securely.', icon: GitBranch },
  { title: 'AI Analyzes', desc: 'Claude Sonnet 4 scans 14 vulnerability categories in ~60s.', icon: Brain },
  { title: 'Report Generated', desc: 'Structured findings with severity, impact, and recommendations.', icon: BarChart3 },
  { title: 'Stored on Walrus', desc: 'Your report is stored permanently on the decentralized network.', icon: Database },
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
  const { isConnected, address, provider } = useWallet();
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
    if (!isConnected || !address) {
      setSubmitError('Connect your Slush wallet to pay for the audit.');
      return;
    }
    if (!provider) {
      setSubmitError('Wallet connection lost. Please reconnect.');
      return;
    }

    setIsSubmitting(true); setSubmitError('');

    try {
      const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_DEMO_WALLET_ADDRESS || '0x7c23479f9746a400ae9fddd93158f97e864dde6837942d863d52c9893e7765a8';
      const costMist = BigInt(scanResult.estimatedAudits) * BigInt(1_000_000_000);

      const tx = new Transaction();
      tx.setSender(address);
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(costMist)]);
      tx.transferObjects([coin], tx.pure.address(TREASURY_ADDRESS));

      let account = null;
      if (provider.accounts) {
        account = provider.accounts.find((a: any) => a.address?.toLowerCase() === address.toLowerCase()) || provider.accounts[0];
      }
      if (!account && typeof provider.getAccounts === 'function') {
        try {
          const legacyAccounts = await provider.getAccounts();
          const found = legacyAccounts?.find((a: any) => {
            const addr = typeof a === 'string' ? a : a?.address;
            return addr?.toLowerCase() === address.toLowerCase();
          });
          if (found) { account = typeof found === 'string' ? { address: found } : found; }
          else if (legacyAccounts?.[0]) { const first = legacyAccounts[0]; account = typeof first === 'string' ? { address: first } : first; }
        } catch { /* ignore */ }
      }
      if (!account && provider.features?.['standard:connect']?.connect) {
        try {
          const connResult = await provider.features['standard:connect'].connect();
          const accounts = connResult.accounts || provider.accounts || [];
          account = accounts.find((a: any) => a.address?.toLowerCase() === address.toLowerCase()) || accounts[0];
        } catch { /* ignore */ }
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
        throw new Error('No active wallet account found. Please try reconnecting.');
      }

      if (txResult.effects?.status?.status === 'failure') {
        throw new Error('Transaction failed on the Sui network. Please try again.');
      }
      const txDigest = txResult.digest || txResult.transactionEffects?.transactionDigest;
      if (!txDigest) throw new Error('No transaction digest returned by wallet.');

      const res = await api.submitRepoAudit({ scanId: scanResult.scanId, projectTrack, txDigest });
      router.push(`/repo-audit/${res.repoAuditId}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit audit.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <FadeIn delay={0.3} className="rounded-2xl border border-white/[0.07] bg-[#0b0b0f]/85 backdrop-blur-xl overflow-hidden shadow-2xl shadow-emerald-950/20">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        <span className="ml-2 text-[11px] text-zinc-600 font-mono flex items-center gap-1">
          <GitBranch className="w-3 h-3" /> github_audit
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Step 1 */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-6 h-6 rounded-full bg-jade-500/10 text-jade-400 flex items-center justify-center font-bold text-[11px]">1</div>
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
            <div className="w-6 h-6 rounded-full bg-jade-500/10 text-jade-400 flex items-center justify-center font-bold text-[11px]">2</div>
            <h3 className="text-sm font-medium text-white">Configure & Submit</h3>
          </div>
          <div className="ml-8 space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Project Track</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {TRACKS.map((track) => (
                  <button key={track.id} onClick={() => setProjectTrack(track.id)}
                    className={`p-2 rounded-md border text-[11px] transition-colors ${projectTrack === track.id
                      ? 'bg-jade-500/8 border-jade-500/20 text-jade-300'
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
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Shield className="w-4 h-4" /> {isConnected ? `Pay ${scanResult?.estimatedAudits || 0} SUI & Audit` : 'Connect Wallet'} <ArrowRight className="w-3.5 h-3.5" /></>}
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
    if (!isConnected) {
      setRecentAudits([]);
      setAuditsLoading(false);
      return;
    }

    const formatted = myAudits.slice(0, 6).map((a) => ({
      id: a.auditId, blobId: a.blobId, contractName: a.contractName,
      createdAt: a.createdAt, overallRisk: a.overallRisk || 'COMPLETE', status: 'COMPLETE',
    }));
    setRecentAudits(formatted);

    // Enrich audits that are missing blobId / overallRisk by fetching from API
    const missing = formatted.filter((a) => !a.blobId);
    if (missing.length === 0) {
      setAuditsLoading(false);
      return;
    }

    Promise.all(
      missing.map((a) => api.getAuditReport(a.id).catch(() => null))
    ).then((results) => {
      setRecentAudits((prev) =>
        prev.map((audit) => {
          const fetched = results.find((r: any) => r?.id === audit.id);
          if (fetched?.blobId) {
            return { ...audit, blobId: fetched.blobId, overallRisk: fetched.overallRisk || audit.overallRisk };
          }
          return audit;
        })
      );
      setAuditsLoading(false);
    });
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
    <main className="relative min-h-screen bg-obsidian">
      <IntroOverlay />
      <CustomCursor />
      <ScrollProgress />

      {/* page-level grain + vignette for a framed, material feel */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.022] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]" style={{ boxShadow: 'inset 0 0 220px 50px rgba(0,0,0,0.55)' }} />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <Hero onStartAudit={() => auditSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} />

      <Divider />

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section className="relative py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div aria-hidden className="absolute top-10 left-1/2 -translate-x-1/2 w-[560px] h-[280px] bg-jade-600/[0.05] rounded-full blur-[120px] pointer-events-none" />

        <SectionHeading
          eyebrow="Capabilities"
          title={<>Everything you need to <span className="lux-gradient">ship securely</span></>}
          subtitle="From access control to gas optimization — comprehensive analysis built for the Sui Move ecosystem."
          className="mb-14"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat, i) => (
            <Reveal key={feat.title} delay={(i % 3) * 0.1}>
              <SpotlightCard className="h-full p-6">
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-jade-500/20 to-champagne-400/10 border border-jade-400/20 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <div aria-hidden className="absolute inset-0 rounded-xl bg-jade-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <feat.icon className="relative w-5 h-5 text-jade-300" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-2 group-hover:text-jade-300 transition-colors">{feat.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">{feat.description}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="relative py-28 bg-[#0a0a0d] overflow-hidden">
        {/* gradient edge borders */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-jade-500/25 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-jade-500/25 to-transparent" />
        {/* Ambient glows */}
        <div aria-hidden className="absolute -top-20 right-[10%] w-[400px] h-[300px] bg-champagne-500/[0.05] rounded-full blur-[120px] pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-[15%] w-[350px] h-[250px] bg-jade-600/[0.04] rounded-full blur-[100px] pointer-events-none" />
        {/* Dot grid background */}
        <div aria-hidden className="absolute inset-0 hiw-dot-grid opacity-20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-16">
            <div>
              <div className="inline-flex items-center gap-2.5 mb-3">
                <span className="h-px w-6 bg-gradient-to-r from-transparent to-champagne-400/70" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-400">The Process</span>
              </div>
              <h2 className="font-display font-medium text-ivory text-[2rem] md:text-[2.6rem] tracking-[-0.02em] leading-[1.1]">
                How It <span className="lux-gradient">Works</span>
              </h2>
            </div>
            <Link href="/how-it-works" className="group text-xs text-jade-400 hover:text-jade-300 font-medium flex items-center gap-1 transition-colors">
              Full explanation <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>

          <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-7">
            {/* Animated connector beam on desktop */}
            <div aria-hidden className="hidden lg:block absolute top-9 left-[10%] right-[10%] h-px">
              <div className="absolute inset-0 bg-gradient-to-r from-jade-500/0 via-jade-500/20 to-jade-500/0" />
              <motion.div
                initial={{ left: '0%', opacity: 0 }}
                whileInView={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                viewport={{ once: true }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 1, ease: 'linear' }}
                className="absolute top-[-2px] w-8 h-[5px] bg-gradient-to-r from-transparent via-jade-400/80 to-transparent rounded-full blur-[1px]"
              />
            </div>

            {HOW_STEPS.map((step, idx) => (
              <Reveal delay={idx * 0.15} key={step.title} className="relative flex flex-col items-center text-center group">
                <motion.div
                  whileHover={{ scale: 1.12, y: -5, rotate: -3 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#15151b] to-[#0e0e12] border border-jade-400/20 flex items-center justify-center mb-5 shadow-lg shadow-emerald-950/40 hiw-glow-pulse"
                >
                  {/* Glow backdrop */}
                  <div aria-hidden className="absolute inset-0 rounded-2xl bg-jade-500/15 blur-md opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                  {/* Pulse ring on hover */}
                  <div aria-hidden className="absolute inset-0 rounded-2xl border border-jade-400/20 opacity-0 group-hover:opacity-100 hiw-pulse-ring" />
                  <step.icon className="relative w-5 h-5 text-jade-300 group-hover:text-jade-200 transition-colors" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-jade-500 to-champagne-500 flex items-center justify-center text-white text-[10px] font-bold ring-4 ring-[#0a0a0d] shadow-md shadow-emerald-950/50">
                    {idx + 1}
                  </div>
                </motion.div>
                <h3 className="text-[13px] font-semibold text-white mb-1.5 group-hover:text-jade-300 transition-colors">{step.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px] group-hover:text-zinc-400 transition-colors">{step.desc}</p>
                {/* Floating particles on hover */}
                {[0, 1, 2].map((p) => (
                  <div
                    key={p}
                    aria-hidden
                    className="absolute w-1 h-1 rounded-full bg-jade-400/60 opacity-0 group-hover:opacity-100 hiw-particle pointer-events-none"
                    style={{ top: `${15 + p * 12}%`, left: `${25 + p * 20}%`, animationDelay: `${p * 0.5}s` }}
                  />
                ))}
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3} className="mt-16">
            <SpotlightCard className="p-6 relative overflow-hidden">
              {/* Scan line effect */}
              <div aria-hidden className="hiw-scan-line bg-gradient-to-r from-transparent via-jade-400/20 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <motion.div
                    whileHover={{ rotate: 12 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </motion.div>
                  <span className="text-sm font-medium text-zinc-200">14 Vulnerability Categories Analyzed</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {VULN_CATEGORIES.map((cat, i) => (
                    <motion.span
                      key={cat}
                      initial={{ opacity: 0, scale: 0.85, y: 8 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ scale: 1.08, y: -2, boxShadow: '0 4px 20px rgba(52,211,153,0.15)' }}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[11px] text-zinc-400 hover:border-jade-400/30 hover:text-jade-300 hover:bg-jade-500/[0.05] transition-all duration-300 cursor-default"
                    >
                      {cat}
                    </motion.span>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>
      </section>

      {/* ── AUDIT EDITOR ──────────────────────────────────────────────── */}
      <section id="audit" ref={auditSectionRef} className="relative py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-jade-600/[0.06] rounded-full blur-[130px] pointer-events-none" />

        <SectionHeading
          eyebrow="Get Started"
          title={<>Audit Your Contract <span className="lux-gradient">Now</span></>}
          subtitle="Paste your Sui Move code or load a demo contract. Results in under 60 seconds."
          className="mb-10"
        />

        <Reveal delay={0.1} className="mb-5">
          <AuditMethodSelector selected={auditMethod} onSelect={setAuditMethod} />
        </Reveal>

        {auditMethod === 'single' ? (
          <Reveal delay={0.2} className="relative rounded-2xl p-px">
            <div aria-hidden className="absolute inset-0 rounded-2xl opacity-70" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.4), rgba(212,189,138,0.12) 45%, rgba(255,255,255,0.04) 75%)' }} />
            <div className="relative rounded-2xl bg-[#0b0b0f]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-emerald-950/30">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-2 text-[11px] text-zinc-500 font-mono">move_contract.move</span>
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
            </div>
          </Reveal>
        ) : (
          <RepoAuditInline />
        )}
      </section>

      <Divider />

      {/* ── RECENT AUDITS ─────────────────────────────────────────────── */}
      <section className="pb-24 pt-4 max-w-5xl mx-auto px-4 sm:px-6">
        <Reveal className="flex items-end justify-between mb-7">
          <div>
            <div className="inline-flex items-center gap-2.5 mb-2">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-champagne-400/70" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-400">Activity</span>
            </div>
            <h2 className="font-display font-medium text-ivory text-[1.9rem] md:text-[2.2rem] tracking-[-0.02em]">Recent Audits</h2>
          </div>
          {isConnected && (
            <Link href="/my-audits" className="group text-xs text-jade-400 hover:text-jade-300 transition-colors font-medium flex items-center gap-1">
              My Audits <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </Reveal>

        {auditsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <SkeletonAuditCard key={i} />)}
          </div>
        ) : recentAudits.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentAudits.map((audit, idx) => (
              <Reveal delay={(idx % 3) * 0.08} key={audit.id}>
                <SpotlightCard
                  onClick={() => audit.blobId && router.push(`/report/${audit.blobId}`)}
                  className={`p-5 ${audit.blobId ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                      {audit.contractName}
                    </h3>
                    <RiskBadge level={audit.overallRisk || audit.status} className="shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono inline-flex items-center gap-1 group-hover:text-jade-400 transition-colors">
                      {audit.blobId ? `${audit.blobId.slice(0, 10)}…` : (audit.id?.startsWith('d') ? 'Demo' : 'Processing…')}
                      {audit.blobId && <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />}
                    </span>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal delay={0.15}>
            <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800 bg-white/[0.01]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-jade-500/15 to-champagne-400/5 border border-jade-400/15 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-jade-400/60" />
              </div>
              <p className="text-sm text-zinc-500">No audits yet — be the first!</p>
              <button
                onClick={() => auditSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-3 text-xs text-jade-400 hover:text-jade-300 transition-colors font-medium"
              >
                Run your first audit →
              </button>
            </div>
          </Reveal>
        )}
      </section>
    </main>
  );
}