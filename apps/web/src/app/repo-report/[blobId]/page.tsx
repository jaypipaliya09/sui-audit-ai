'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { WalrusLink } from '@/components/WalrusLink';
import { FindingCard } from '@/components/FindingCard';
import {
  Loader2, GitBranch, FileCode2, AlertTriangle,
  ChevronDown, ChevronRight, ExternalLink, Shield, Lightbulb, Copy
} from 'lucide-react';

/** Normalize an audit finding so it renders with the shared FindingCard, matching
 * the look of the direct-UI and CLI reports. */
function normalizeFinding(f: any, i: number) {
  return {
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
  };
}

export default function RepoReportPage() {
  const params = useParams();
  const blobId = params.blobId as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openContracts, setOpenContracts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getRepoReportByBlobId(blobId)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [blobId]);

  const toggleContract = (path: string) => {
    setOpenContracts((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden">
        <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] bg-emerald-500/10 pointer-events-none" />
        <Loader2 className="relative z-10 w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center p-4">
        <div className="text-center glass-panel p-10 max-w-md w-full border-red-500/20">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-display font-medium text-ivory mb-2">Report Not Found</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{error || 'Unable to load this report. It may have expired or never existed.'}</p>
        </div>
      </div>
    );
  }

  const findings = report.findingsJson
    ? (typeof report.findingsJson === 'string' ? JSON.parse(report.findingsJson) : report.findingsJson)
    : null;
  const repoName = report.repoName || report.contractName || 'Repository';
  const commitSha = report.commitSha || '';
  const overallRisk = report.overallRisk || 'INFO';
  const contracts = findings?.contracts || findings?.perContractFindings || [];
  const sharedRisks = findings?.sharedRisks || findings?.crossContractRisks || [];
  const recommendations = findings?.recommendations || findings?.overallRecommendations || [];
  const executiveSummary = findings?.executiveSummary || findings?.summary?.executiveSummary || '';

  return (
    <div className="min-h-screen bg-obsidian pt-24 pb-20 relative overflow-hidden">
      {/* Dynamic Background Effect */}
      <div aria-hidden className="absolute top-0 right-1/4 w-[700px] h-[500px] rounded-full blur-[150px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)' }} />
      <div aria-hidden className="absolute top-40 -left-20 w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(77,162,255,0.04), transparent 70%)' }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn glass-panel p-6 border border-white/[0.04]">
          <div>
            <h1 className="text-2xl font-display font-medium text-ivory flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              {repoName}
            </h1>
            <div className="flex items-center gap-3 mt-3 text-xs font-medium text-zinc-400 pl-1">
              {commitSha && (
                <span className="flex items-center gap-1.5 font-mono px-2 py-1 rounded-md bg-white/5 border border-white/[0.05]">
                  <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                  {commitSha.slice(0, 7)}
                </span>
              )}
              {report.projectTrack && (
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  {report.projectTrack}
                </span>
              )}
            </div>
          </div>
          <div className="sm:text-right">
            <RiskBadge level={overallRisk} />
          </div>
        </div>

        {/* Executive Summary */}
        {executiveSummary && (
          <div className="glass-panel p-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Executive Summary
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">{executiveSummary}</p>
          </div>
        )}

        {/* Cross-contract risks */}
        {sharedRisks.length > 0 && (
          <div className="glass-panel border border-red-500/20 bg-red-500/[0.02] p-6 animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Cross-Contract Risks
            </h3>
            <div className="space-y-3">
              {sharedRisks.map((risk: any, i: number) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white/[0.02] border border-red-500/10 rounded-xl transition-colors hover:bg-red-500/[0.05]">
                  <RiskBadge level={risk.severity || 'HIGH'} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-ivory mb-1">{risk.title || risk.description}</h4>
                    {risk.description && risk.title && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{risk.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-contract */}
        {contracts.length > 0 && (
          <div className="space-y-3 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4 pl-1">Per-Contract Findings</h3>
            {contracts.map((contract: any, i: number) => {
              const path = contract.path || contract.contractName || `Contract ${i + 1}`;
              const isOpen = openContracts[path] || false;
              const cFindings = contract.findings || [];

              return (
                <div key={i} className="glass-panel overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => toggleContract(path)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                        : <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                      }
                    </div>
                    <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-sm text-ivory font-mono flex-1 text-left truncate">{path}</span>
                    <RiskBadge level={contract.overallRisk || contract.risk || 'CLEAN'} />
                    <span className="text-[11px] font-medium text-zinc-500 ml-3 bg-white/5 px-2 py-0.5 rounded-full">{cFindings.length} findings</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/[0.04] px-5 py-4 space-y-4 bg-white/[0.01]">
                      {contract.contractHash && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-obsidian border border-white/[0.04]">
                          <div>
                            <div className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-widest">Contract Hash</div>
                            <div className="text-[12px] text-zinc-300 font-mono">{contract.contractHash}</div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(contract.contractHash);
                            }}
                            className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors border border-transparent hover:border-emerald-500/30"
                            title="Copy to Verify"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {cFindings.length > 0 ? (
                        <div className="space-y-3">
                          {cFindings.map((finding: any, j: number) => (
                            <FindingCard key={j} finding={normalizeFinding(finding, j) as any} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-emerald-400/80 italic p-4 text-center bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl">
                          No vulnerabilities found in this contract. ✨
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="glass-panel p-6 animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Repository Recommendations
            </h3>
            <ul className="space-y-2">
              {recommendations.map((rec: string, i: number) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-3">
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Walrus + On-Chain */}
        {report.blobId && report.walrusUrl && (
          <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <WalrusLink blobId={report.blobId} walrusUrl={report.walrusUrl} />
          </div>
        )}

        {report.onChainTxDigest && (
          <div className="glass-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">On-Chain Registry</h4>
              <p className="text-xs text-zinc-300 font-mono break-all">{report.onChainTxDigest}</p>
            </div>
            <a
              href={`https://suiscan.xyz/testnet/tx/${report.onChainTxDigest}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 btn-secondary text-xs px-3 py-1.5"
            >
              Verify on Suiscan <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
