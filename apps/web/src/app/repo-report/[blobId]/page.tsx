'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { WalrusLink } from '@/components/WalrusLink';
import {
  Loader2, GitBranch, FileCode2, AlertTriangle,
  ChevronDown, ChevronRight, ExternalLink, Shield,
} from 'lucide-react';

export default function RepoReportPage() {
  const params = useParams();
  const blobId = params.blobId as string;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openContracts, setOpenContracts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getReportByBlobId(blobId)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [blobId]);

  const toggleContract = (path: string) => {
    setOpenContracts((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Report Not Found</h2>
          <p className="text-gray-500 text-sm">{error || 'Unable to load this report.'}</p>
        </div>
      </div>
    );
  }

  const findings = report.findingsJson ? (typeof report.findingsJson === 'string' ? JSON.parse(report.findingsJson) : report.findingsJson) : null;
  const repoName = report.repoName || report.contractName || 'Repository';
  const commitSha = report.commitSha || '';
  const overallRisk = report.overallRisk || 'INFO';

  // Parse consolidated findings
  const contracts = findings?.contracts || findings?.perContractFindings || [];
  const sharedRisks = findings?.sharedRisks || findings?.crossContractRisks || [];
  const recommendations = findings?.recommendations || findings?.overallRecommendations || [];
  const executiveSummary = findings?.executiveSummary || findings?.summary?.executiveSummary || '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-indigo-400" />
              {repoName}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              {commitSha && (
                <span className="flex items-center gap-1 font-mono">
                  <GitBranch className="w-3.5 h-3.5" />
                  {commitSha.slice(0, 7)}
                </span>
              )}
              {report.projectTrack && (
                <span className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-xs">
                  {report.projectTrack}
                </span>
              )}
            </div>
          </div>
          <RiskBadge level={overallRisk} className="text-sm px-4 py-1.5" />
        </div>

        {/* Executive Summary */}
        {executiveSummary && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Executive Summary</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{executiveSummary}</p>
          </div>
        )}

        {/* Cross-Contract Risks */}
        {sharedRisks.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Cross-Contract Risks
            </h3>
            <div className="space-y-3">
              {sharedRisks.map((risk: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#0f0f0f] rounded-xl">
                  <RiskBadge level={risk.severity || 'HIGH'} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-white">{risk.title || risk.description}</h4>
                    {risk.description && risk.title && (
                      <p className="text-xs text-gray-500 mt-1">{risk.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Contract Findings */}
        {contracts.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Per-Contract Findings</h3>
            {contracts.map((contract: any, i: number) => {
              const path = contract.path || contract.contractName || `Contract ${i + 1}`;
              const isOpen = openContracts[path] || false;
              const cFindings = contract.findings || [];

              return (
                <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleContract(path)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    <FileCode2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm text-white font-medium flex-1 text-left">{path}</span>
                    <RiskBadge level={contract.overallRisk || contract.risk || 'CLEAN'} />
                    <span className="text-xs text-gray-600 ml-2">{cFindings.length} findings</span>
                  </button>

                  {isOpen && cFindings.length > 0 && (
                    <div className="border-t border-[#2a2a2a] px-4 py-3 space-y-3">
                      {cFindings.map((finding: any, j: number) => (
                        <div key={j} className="p-3 bg-[#0f0f0f] rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <RiskBadge level={finding.severity || 'INFO'} />
                            <span className="text-sm text-white font-medium">{finding.title}</span>
                          </div>
                          <p className="text-xs text-gray-500">{finding.description}</p>
                          {finding.recommendation && (
                            <p className="text-xs text-indigo-400 mt-2">💡 {finding.recommendation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-4">Repository-Wide Recommendations</h3>
            <ul className="space-y-2">
              {recommendations.map((rec: string, i: number) => (
                <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Walrus + On-Chain Links */}
        {report.blobId && report.walrusUrl && (
          <WalrusLink blobId={report.blobId} walrusUrl={report.walrusUrl} />
        )}

        {report.onChainTxDigest && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">On-Chain Registry</h4>
              <p className="text-xs text-gray-500 font-mono mt-1">{report.onChainTxDigest}</p>
            </div>
            <a
              href={`https://suiscan.xyz/testnet/tx/${report.onChainTxDigest}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View on Suiscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
