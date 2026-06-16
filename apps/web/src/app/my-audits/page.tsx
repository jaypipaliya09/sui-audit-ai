'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Shield, Clock, ArrowRight, ChevronLeft, ExternalLink, Zap, Scale, Terminal, FileText } from 'lucide-react';
import { useWallet } from '@/lib/walletContext';
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

  useEffect(() => {
    if (!address) return;
    api
      .getAuditRuns(address)
      .then((runs) => setCliRuns(runs as CliRun[]))
      .catch(() => setCliRuns([]));
  }, [address]);

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
      <main className="min-h-screen bg-[#0d1117] flex items-center justify-center pt-16 p-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Wallet className="w-10 h-10 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-3">My Audits</h1>
            <p className="text-gray-500 leading-relaxed">
              Connect your Sui wallet to see all the audits you have submitted. Your audit history is stored locally per wallet.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 border border-[#30363d] hover:border-[#444c56] text-gray-300 hover:text-white rounded-xl transition-all font-medium text-sm"
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
    <main className="min-h-screen bg-[#0d1117] pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">My Audits</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Wallet className="w-3 h-3 text-white" />
                </div>
                <span className="font-mono text-xs text-gray-500">{address && shortAddr(address)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedIds([]);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                  compareMode
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-[#161b22] border border-[#30363d] text-gray-300 hover:bg-[#21262d]'
                }`}
              >
                <Scale className="w-4 h-4" />
                Compare
              </button>
              <Link
                href="/#audit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
              >
                <Zap className="w-4 h-4" />
                New Audit
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Audits', value: myAudits.length },
            { label: 'Completed', value: myAudits.filter((a) => a.blobId).length },
            { label: 'Critical Found', value: myAudits.filter((a) => a.overallRisk === 'CRITICAL').length },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl border border-[#21262d] bg-[#161b22] text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Audit list */}
        {myAudits.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#30363d] rounded-2xl">
            <Shield className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400 mb-2">No audits yet</h3>
            <p className="text-gray-600 text-sm mb-6">Submit your first Sui Move contract to get started.</p>
            <Link
              href="/#audit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all"
            >
              Run Your First Audit
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myAudits.map((audit, idx) => (
              <div
                key={audit.auditId}
                onClick={() =>
                  audit.blobId &&
                  router.push(
                    audit.kind === 'repo'
                      ? `/repo-report/${audit.blobId}`
                      : `/report/${audit.blobId}`,
                  )
                }
                className={`group flex items-center gap-4 p-5 rounded-xl border border-[#21262d] bg-[#161b22] transition-all duration-200 ${
                  audit.blobId
                    ? 'hover:bg-[#1c2128] hover:border-[#30363d] cursor-pointer hover:-translate-y-0.5'
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
                      className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500/20 bg-[#0f0f0f]"
                    />
                  </div>
                ) : (
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-[#21262d] flex items-center justify-center text-xs font-bold text-gray-500">
                    {idx + 1}
                  </div>
                )}

                {/* Contract info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      audit.kind === 'repo'
                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                    }`}>
                      {audit.kind === 'repo' ? 'REPO' : 'DIRECT'}
                    </span>
                    <h3 className="font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
                      {audit.contractName}
                    </h3>
                    {audit.overallRisk && <RiskBadge level={audit.overallRisk} />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(audit.createdAt).toLocaleString()}
                    </span>
                    {audit.blobId && (
                      <span className="font-mono">{audit.blobId.slice(0, 16)}…</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {audit.blobId ? (
                    <>
                      <a
                        href={`${API_BASE}/reports/pdf/${audit.blobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-[#21262d] transition-colors"
                        title="View PDF report"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <div className="p-2 rounded-lg text-gray-500 group-hover:text-gray-200 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg">Processing…</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Move Auditor CLI runs (paid per-file audits from the move-auditor package) */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-black text-white tracking-tight">Move Auditor CLI Runs</h2>
          </div>

          {cliRuns.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#30363d] rounded-2xl">
              <Terminal className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No CLI runs yet. Audit from the terminal with{' '}
                <code className="text-blue-400">move-auditor</code> and pay per file in USDC.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cliRuns.map((run) => (
                <div key={run.id} className="rounded-xl border border-[#21262d] bg-[#161b22] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">
                      {run.totalCostUsdc} USDC · {run.files.length} file{run.files.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {run.files.map((f) => (
                      <div
                        key={f.id}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] transition-all"
                      >
                        <button
                          onClick={async () => {
                            // Fetch the full file (auditJson + markdown) and render it.
                            const full = await api.getAuditRun(run.id);
                            const match = full.files.find((x: CliRunFile) => x.id === f.id);
                            setOpenFile({ ...(match ?? f), createdAt: run.createdAt });
                          }}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                          <span className="flex-1 min-w-0 truncate text-sm text-gray-300 font-mono">
                            {f.file.split('/').pop()}
                          </span>
                          <span className="text-xs text-gray-600">{f.findingsCount} findings</span>
                          <RiskBadge level={f.overallRisk as any} />
                        </button>
                        {f.blobId && (
                          <a
                            href={`${API_BASE}/reports/pdf/${f.blobId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg border border-blue-500/20"
                            title="View PDF report"
                          >
                            <ExternalLink className="w-3 h-3" /> PDF
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
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpenFile(null)}
        >
          <div
            className="bg-[#0d1117] border border-[#30363d] rounded-2xl max-w-5xl w-full max-h-[88vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] shrink-0">
              <h3 className="font-mono text-sm text-gray-200 truncate">{openFile.file}</h3>
              <button
                onClick={() => setOpenFile(null)}
                className="text-gray-500 hover:text-white text-sm"
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#2a2a2a] shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-8">
          <span className="text-sm font-medium text-gray-300">
            <span className="text-white">{selectedIds.length}</span> of 2 selected
          </span>
          <button
            onClick={handleCompareSubmit}
            disabled={selectedIds.length !== 2}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-medium px-4 py-2 rounded-full transition-all"
          >
            Compare Audits
          </button>
        </div>
      )}
    </main>
  );
}
