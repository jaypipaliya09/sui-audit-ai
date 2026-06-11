'use client';

import React, { useState } from 'react';
import { FindingCard } from './FindingCard';
import { RiskBadge } from './RiskBadge';
import { WalrusLink } from './WalrusLink';
import dynamic from 'next/dynamic';
import { CheckCircle2, AlertCircle, Zap, ShieldCheck, Share2, Check } from 'lucide-react';
import { AuditFinding, GasAnalysis, AuditSummary } from '@sui-audit-ai/shared-types';

const SeverityChart = dynamic(() => import('./SeverityChart'), { ssr: false });

interface ReportViewerProps {
  audit: {
    id: string;
    contractName: string;
    overallRisk: string;
    createdAt: string;
    blobId: string;
    walrusUrl: string;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    findingsJson: AuditFinding[];
    summaryJson: AuditSummary & {
      gasAnalysis?: GasAnalysis;
      overallRecommendations?: string[];
    };
  };
}

export function ReportViewer({ audit }: ReportViewerProps) {
  const { summaryJson: summary, findingsJson: findings } = audit;
  const isClean = audit.overallRisk === 'CLEAN';
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{audit.contractName}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <span className="font-medium text-gray-300">Audited:</span>
              {new Date(audit.createdAt).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              })}
            </span>
            <span>•</span>
            <span>{summary.moduleCount} modules</span>
            <span>•</span>
            <span>{summary.lineCount} lines</span>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <RiskBadge level={audit.overallRisk} className="text-sm px-3 py-1" />
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#30363d] bg-[#21262d] hover:bg-[#2d333b] text-gray-400 hover:text-gray-200 text-xs font-medium transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied!' : 'Share Report'}
          </button>
        </div>
      </div>

      {/* Findings Count Chips */}
      <div className="flex flex-wrap gap-3">
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <span className="text-red-500 font-semibold">{audit.criticalCount}</span>
          <span className="text-red-400 text-sm">Critical</span>
        </div>
        <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-2">
          <span className="text-orange-500 font-semibold">{audit.highCount}</span>
          <span className="text-orange-400 text-sm">High</span>
        </div>
        <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
          <span className="text-yellow-500 font-semibold">{audit.mediumCount}</span>
          <span className="text-yellow-400 text-sm">Medium</span>
        </div>
        <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
          <span className="text-blue-500 font-semibold">{audit.lowCount}</span>
          <span className="text-blue-400 text-sm">Low</span>
        </div>
        <div className="px-4 py-2 bg-gray-500/10 border border-gray-500/20 rounded-lg flex items-center gap-2">
          <span className="text-gray-400 font-semibold">{audit.infoCount}</span>
          <span className="text-gray-400 text-sm">Info</span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          Executive Summary
        </h2>
        {isClean ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <h3 className="text-xl font-bold text-green-400 mb-2">No Vulnerabilities Found</h3>
            <p className="text-green-200/80 max-w-2xl">{summary.executiveSummary}</p>
          </div>
        ) : (
          <p className="text-gray-300 leading-relaxed text-lg">{summary.executiveSummary}</p>
        )}
      </div>

      {/* Findings List */}
      {!isClean && findings && findings.length > 0 && (
        <div className="space-y-6">
          <SeverityChart findings={findings} />
          
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Detailed Findings ({findings.length})
            </h2>
            <div className="space-y-3">
              {findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gas & Optimization */}
      {summary.gasAnalysis && (
        <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Gas & Optimization Analysis
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-gray-400 font-medium mb-3 uppercase tracking-wider text-xs">Expensive Patterns</h3>
              <ul className="space-y-2">
                {summary.gasAnalysis.expensivePatterns.map((item, i) => (
                  <li key={i} className="text-red-200/80 text-sm flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span> {item}
                  </li>
                ))}
                {summary.gasAnalysis.expensivePatterns.length === 0 && (
                  <li className="text-gray-500 text-sm">None detected.</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-gray-400 font-medium mb-3 uppercase tracking-wider text-xs">Optimization Suggestions</h3>
              <ul className="space-y-2">
                {summary.gasAnalysis.optimizationSuggestions.map((item, i) => (
                  <li key={i} className="text-green-200/80 text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span> {item}
                  </li>
                ))}
                {summary.gasAnalysis.optimizationSuggestions.length === 0 && (
                  <li className="text-gray-500 text-sm">No suggestions.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Overall Recommendations */}
      {summary.overallRecommendations && summary.overallRecommendations.length > 0 && (
        <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Overall Recommendations</h2>
          <ul className="space-y-3">
            {summary.overallRecommendations.map((rec, i) => (
              <li key={i} className="text-gray-300 flex items-start gap-3">
                <span className="bg-gray-800 text-gray-400 rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-sm mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Walrus Link */}
      {audit.blobId && audit.walrusUrl && (
        <div className="pt-4">
          <WalrusLink blobId={audit.blobId} walrusUrl={audit.walrusUrl} />
        </div>
      )}
    </div>
  );
}
