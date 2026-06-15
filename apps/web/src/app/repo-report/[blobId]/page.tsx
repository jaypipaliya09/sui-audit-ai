'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { WalrusLink } from '@/components/WalrusLink';
import {
  Loader2, GitBranch, FileCode2, AlertTriangle,
  ChevronDown, ChevronRight, ExternalLink, Shield, Lightbulb, Copy
} from 'lucide-react';

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
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">Report Not Found</h2>
          <p className="text-xs text-zinc-500">{error || 'Unable to load this report.'}</p>
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
    <div className="min-h-screen bg-[#09090b] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              {repoName}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              {commitSha && (
                <span className="flex items-center gap-1 font-mono">
                  <GitBranch className="w-3 h-3" />
                  {commitSha.slice(0, 7)}
                </span>
              )}
              {report.projectTrack && (
                <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px]">
                  {report.projectTrack}
                </span>
              )}
            </div>
          </div>
          <RiskBadge level={overallRisk} />
        </div>

        {/* Executive Summary */}
        {executiveSummary && (
          <div className="rounded-lg surface p-5 animate-fadeInUp">
            <h3 className="text-sm font-medium text-white mb-2">Executive Summary</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{executiveSummary}</p>
          </div>
        )}

        {/* Cross-contract risks */}
        {sharedRisks.length > 0 && (
          <div className="rounded-lg bg-red-500/[0.04] border border-red-500/15 p-5">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Cross-Contract Risks
            </h3>
            <div className="space-y-2">
              {sharedRisks.map((risk: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-zinc-900/60 rounded-lg">
                  <RiskBadge level={risk.severity || 'HIGH'} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-medium text-white">{risk.title || risk.description}</h4>
                    {risk.description && risk.title && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">{risk.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-contract */}
        {contracts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white mb-2">Per-Contract Findings</h3>
            {contracts.map((contract: any, i: number) => {
              const path = contract.path || contract.contractName || `Contract ${i + 1}`;
              const isOpen = openContracts[path] || false;
              const cFindings = contract.findings || [];

              return (
                <div key={i} className="rounded-lg surface overflow-hidden">
                  <button
                    onClick={() => toggleContract(path)}
                    className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/[0.015] transition-colors"
                  >
                    {isOpen
                      ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                      : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                    }
                    <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs text-white font-medium flex-1 text-left">{path}</span>
                    <RiskBadge level={contract.overallRisk || contract.risk || 'CLEAN'} />
                    <span className="text-[10px] text-zinc-700 ml-1">{cFindings.length} findings</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-zinc-800/40 px-4 py-3 space-y-2">
                      {contract.contractHash && (
                        <div className="mb-3 flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800/60">
                          <div>
                            <div className="text-[10px] text-zinc-500 font-medium mb-0.5 uppercase tracking-wider">Contract Hash</div>
                            <div className="text-[11px] text-zinc-300 font-mono">{contract.contractHash}</div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(contract.contractHash);
                              // We could add a toast here, but simple copy is fine
                            }}
                            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                            title="Copy to Verify"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {cFindings.length > 0 ? cFindings.map((finding: any, j: number) => (
                        <div key={j} className="p-3 bg-zinc-900/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1.5">
                            <RiskBadge level={finding.severity || 'INFO'} />
                            <span className="text-xs text-white font-medium">{finding.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">{finding.description}</p>
                          {finding.recommendation && (
                            <div className="flex items-start gap-1.5 mt-2 text-[11px] text-indigo-400">
                              <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" />
                              {finding.recommendation}
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="text-xs text-zinc-500 italic p-2 text-center">No vulnerabilities found in this contract.</div>
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
          <div className="rounded-lg surface p-5">
            <h3 className="text-sm font-medium text-white mb-3">Repository Recommendations</h3>
            <ul className="space-y-1.5">
              {recommendations.map((rec: string, i: number) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Walrus + On-Chain */}
        {report.blobId && report.walrusUrl && (
          <WalrusLink blobId={report.blobId} walrusUrl={report.walrusUrl} />
        )}

        {report.onChainTxDigest && (
          <div className="rounded-lg surface p-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-medium text-white">On-Chain Registry</h4>
              <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{report.onChainTxDigest}</p>
            </div>
            <a
              href={`https://suiscan.xyz/testnet/tx/${report.onChainTxDigest}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              Suiscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
