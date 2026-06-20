'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Shield, Clock, ArrowRight, ChevronLeft, ExternalLink, Zap, Scale, Terminal, FileText } from 'lucide-react';
import { useWallet, type SavedAudit } from '@/lib/walletContext';
import { RiskBadge } from '@/components/RiskBadge';
import { ReportMarkdown } from '@/components/ReportMarkdown';
import { ReportViewer } from '@/components/ReportViewer';
import { api } from '@/lib/api';

interface CliRunFile {
  id: string;
  file: string;
  overallRisk: string;
  findingsCount: number;
  markdown?: string;
  auditJson?: any;
  createdAt?: string;
  blobId?: string;
  walrusUrl?: string;
}

/** Map the CLI structured audit JSON into the shape ReportViewer expects, so
 * CLI reports render with the exact same UI as web audits. */
function cliToReportAudit(file: CliRunFile) {
  const aj = file.auditJson || {};
  // Normalize findings so both the new structured shape and any older simple
  // shape (location as a string, no category) render without crashing.
  const findings = (aj.findings || []).map((f: any, i: number) => ({
    id: f.id || `FIND-${String(i + 1).padStart(3, '0')}`,
    title: f.title || 'Finding',
    severity: f.severity || 'INFO',
    category: f.category || 'OTHER',
    location:
      f.location && typeof f.location === 'object'
        ? {
            module: f.location.module || '',
            function: f.location.function ?? null,
            lineHint: f.location.lineHint || '',
          }
        : { module: '', function: null, lineHint: typeof f.location === 'string' ? f.location : '' },
    description: f.description || '',
    impact: f.impact || '',
    recommendation: f.recommendation || '',
    codeSnippet: f.codeSnippet ?? null,
  }));
  const count = (sev: string) =>
    findings.filter((f: any) => (f.severity || '').toUpperCase() === sev).length;
  return {
    id: file.id,
    contractName: aj.summary?.contractName || file.file.split('/').pop() || 'Contract',
    overallRisk: aj.summary?.overallRisk || file.overallRisk,
    createdAt: file.createdAt || new Date().toISOString(),
    blobId: '',
    walrusUrl: '',
    criticalCount: count('CRITICAL'),
    highCount: count('HIGH'),
    mediumCount: count('MEDIUM'),
    lowCount: count('LOW'),
    infoCount: count('INFO'),
    findingsJson: findings,
    summaryJson: {
      contractName: aj.summary?.contractName || 'Contract',
      moduleCount: aj.summary?.moduleCount ?? 1,
      lineCount: aj.summary?.lineCount ?? 0,
      overallRisk: aj.summary?.overallRisk || file.overallRisk,
      executiveSummary: aj.summary?.executiveSummary || 'No summary available.',
      gasAnalysis: aj.gasAnalysis,
      overallRecommendations: aj.overallRecommendations,
    },
  };
}
interface CliRun {
  id: string;
  createdAt: string;
  totalCostUsdc: number;
  txDigest?: string;
  files: CliRunFile[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function shortAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export default function MyAuditsPage() {
  const router = useRouter();
  const { address, isConnected, myAudits } = useWallet();
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cliRuns, setCliRuns] = useState<CliRun[]>([]);
  const [openFile, setOpenFile] = useState<CliRunFile | null>(null);
  const [walletAudits, setWalletAudits] = useState<SavedAudit[]>([]);

  useEffect(() => {
    if (!address) return;
    api
      .getAuditRuns(address)
      .then((runs) => setCliRuns(runs as CliRun[]))
      .catch(() => setCliRuns([]));
    api
      .getAuditsByWallet(address)
      .then((audits) =>
        setWalletAudits(
          audits.map((a: any) => ({
            auditId: a.id,
            blobId: a.blobId || '',
            contractName: a.contractName,
            createdAt: a.createdAt,
            overallRisk: a.overallRisk,
            kind: 'direct' as const,
          })),
        ),
      )
      .catch(() => setWalletAudits([]));
  }, [address]);

  // Merge server-fetched wallet audits with localStorage audits (server wins on blobId/risk).
  const mergedAudits: SavedAudit[] = (() => {
    const map = new Map<string, SavedAudit>();
    // localStorage first (has kind='repo' entries too)
    for (const a of myAudits) map.set(a.auditId, a);
    // server overwrites with fresh blobId/overallRisk
    for (const a of walletAudits) {
      const existing = map.get(a.auditId);
      map.set(a.auditId, { ...existing, ...a, blobId: a.blobId || existing?.blobId || '' });
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  })();

  // Flatten CLI runs to their per-file audits so they count alongside the
  // direct-UI and repo-link audits in the stats bar.
  const cliFiles: CliRunFile[] = cliRuns.flatMap((run) => run.files);

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleCompareSubmit = () => {
    if (selectedIds.length === 2) {
      router.push(`/compare?previous=${selectedIds[1]}&current=${selectedIds[0]}`);
    }
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-obsidian flex items-center justify-center pt-16 p-4 relative overflow-hidden">
        {/* Ambient background glow */}
        <div aria-hidden className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="max-w-md mx-auto text-center space-y-6 relative z-10 glass-panel p-10 border border-white/[0.05]">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <Wallet className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-medium text-ivory mb-3">My Audits</h1>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Connect your Sui wallet to see all the audits you have submitted. Your audit history is stored securely per wallet.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/"
              className="btn-secondary w-full sm:w-auto"
            >
              <ChevronLeft className="w-4 h-4" />
              Go Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-obsidian pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background */}
      <div aria-hidden className="absolute -top-40 left-1/4 w-[800px] h-[400px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)' }} />
      
      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-ivory transition-colors mb-6 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-medium text-ivory tracking-tight drop-shadow-md">My Audits</h1>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                  <Wallet className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="font-mono text-xs text-zinc-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">{address && shortAddr(address)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedIds([]);
                }}
                className={compareMode ? 'btn-primary' : 'btn-secondary'}
              >
                <Scale className="w-4 h-4" />
                {compareMode ? 'Cancel Compare' : 'Compare'}
              </button>
              <Link
                href="/#audit"
                className="btn-primary"
              >
                <Zap className="w-4 h-4" />
                New Audit
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Audits', value: mergedAudits.length + cliFiles.length },
            {
              label: 'Completed',
              value:
                mergedAudits.filter((a) => a.blobId).length +
                cliFiles.filter((f) => f.blobId).length,
            },
            {
              label: 'Critical Found',
              value:
                mergedAudits.filter((a) => (a.overallRisk || '').toUpperCase() === 'CRITICAL').length +
                cliFiles.filter((f) => (f.overallRisk || '').toUpperCase() === 'CRITICAL').length,
            },
          ].map((stat, i) => (
            <div key={stat.label} style={{ animationDelay: `${i * 0.08}s` }} className="glass-panel p-6 text-center hover:-translate-y-1 hover:border-emerald-500/20 transition-all duration-300 animate-fadeInUp">
              <div className="text-3xl font-display font-bold text-ivory">{stat.value}</div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mt-2">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Audit list */}
        {mergedAudits.length === 0 ? (
          <div className="text-center py-24 glass-panel border-dashed border-white/[0.1] rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-display font-medium text-ivory mb-2">No audits yet</h3>
            <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto">Submit your first Sui Move contract or GitHub repository to get started.</p>
            <Link
              href="/#audit"
              className="btn-primary"
            >
              Run Your First Audit
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mergedAudits.map((audit, idx) => (
              <div
                key={audit.auditId}
                style={{ animationDelay: `${idx * 0.06}s` }}
                onClick={() =>
                  audit.blobId &&
                  router.push(
                    audit.kind === 'repo'
                      ? `/repo-report/${audit.blobId}`
                      : `/report/${audit.blobId}`,
                  )
                }
                className={`group flex items-center gap-4 p-5 rounded-2xl border border-white/[0.04] bg-[#0a0a0c]/60 backdrop-blur-md transition-all duration-300 shadow-premium-sm animate-fadeInUp ${
                  audit.blobId
                    ? 'hover:bg-[#0a0a0c]/80 hover:border-emerald-500/30 cursor-pointer hover:-translate-y-1 hover:shadow-premium-hover'
                    : 'opacity-70'
                }`}
              >
                {/* Checkbox / Index */}
                {compareMode ? (
                  <div className="shrink-0 flex items-center justify-center pl-2">
                    <input
                      type="checkbox"
                      disabled={!selectedIds.includes(audit.auditId) && selectedIds.length >= 2}
                      checked={selectedIds.includes(audit.auditId)}
                      onChange={(e) => toggleSelection(e as any, audit.auditId)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500/20 bg-obsidian"
                    />
                  </div>
                ) : (
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-sm font-bold text-zinc-500 border border-white/[0.02]">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                )}

                {/* Contract info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`shrink-0 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${
                      audit.kind === 'repo'
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {audit.kind === 'repo' ? 'REPO' : 'DIRECT'}
                    </span>
                    <h3 className="text-lg font-semibold text-ivory truncate group-hover:text-emerald-300 transition-colors">
                      {audit.contractName}
                    </h3>
                    {audit.overallRisk && <RiskBadge level={audit.overallRisk} />}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(audit.createdAt).toLocaleString()}
                    </span>
                    {audit.blobId && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/[0.04] font-mono text-[10px]">
                        {audit.blobId.slice(0, 16)}…
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0 pr-2">
                  {audit.blobId ? (
                    <>
                      <a
                        href={`${API_BASE}/reports/pdf/${audit.blobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2.5 rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title="View PDF report"
                      >
                        <ExternalLink className="w-4.5 h-4.5" />
                      </a>
                      <div className="p-2.5 rounded-xl text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Processing…
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Move Auditor CLI runs (paid per-file audits from the move-auditor package) */}
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-display font-medium text-ivory tracking-tight drop-shadow-md">CLI Audit Runs</h2>
          </div>

          {cliRuns.length === 0 ? (
            <div className="text-center py-16 glass-panel border-dashed border-white/[0.1] rounded-3xl">
              <Terminal className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                No CLI runs yet. Audit directly from the terminal with{' '}
                <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">move-auditor</code> and pay per file in USDC.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {cliRuns.map((run) => (
                <div key={run.id} className="glass-panel p-6">
                  <div className="flex items-center justify-between mb-5 border-b border-white/[0.06] pb-4">
                    <span className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {run.totalCostUsdc} USDC · {run.files.length} file{run.files.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {run.files.map((f) => (
                      <div
                        key={f.id}
                        className="group w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-blue-500/30 transition-all duration-300"
                      >
                        <button
                          onClick={async () => {
                            // Fetch the full file (auditJson + markdown) and render it.
                            const full = await api.getAuditRun(run.id);
                            const match = full.files.find((x: CliRunFile) => x.id === f.id);
                            setOpenFile({ ...(match ?? f), createdAt: run.createdAt });
                          }}
                          className="flex items-center gap-4 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <FileText className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="truncate text-sm text-ivory font-mono group-hover:text-blue-300 transition-colors">
                              {f.file.split('/').pop()}
                            </h4>
                            <span className="text-xs text-zinc-500">{f.findingsCount} findings</span>
                          </div>
                          <RiskBadge level={f.overallRisk as any} />
                        </button>
                        {f.blobId && (
                          <a
                            href={`${API_BASE}/reports/pdf/${f.blobId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                            title="View PDF report"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> PDF
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report viewer modal */}
      {openFile && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setOpenFile(null)}
        >
          <div
            className="glass-panel !rounded-2xl max-w-5xl w-full max-h-[88vh] overflow-hidden flex flex-col shadow-premium-lg animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
              <h3 className="font-mono text-sm text-zinc-300 truncate">{openFile.file}</h3>
              <button
                onClick={() => setOpenFile(null)}
                className="text-zinc-500 hover:text-ivory text-sm transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-6 overflow-auto">
              {openFile.auditJson ? (
                <ReportViewer audit={cliToReportAudit(openFile) as any} />
              ) : (
                <ReportMarkdown>{openFile.markdown || 'No report content.'}</ReportMarkdown>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Compare Action */}
      {compareMode && selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-panel !rounded-full shadow-premium-lg px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-8">
          <span className="text-sm font-medium text-zinc-300">
            <span className="text-ivory font-semibold">{selectedIds.length}</span> of 2 selected
          </span>
          <button
            onClick={handleCompareSubmit}
            disabled={selectedIds.length !== 2}
            className="btn-primary !rounded-full disabled:opacity-40 disabled:cursor-not-allowed text-sm px-4 py-2"
          >
            <Scale className="w-3.5 h-3.5" />
            Compare Audits
          </button>
        </div>
      )}
    </main>
  );
}
