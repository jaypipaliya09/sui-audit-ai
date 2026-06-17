'use client';

import React, { useState } from 'react';
import { FindingCard } from './FindingCard';
import { RiskBadge } from './RiskBadge';
import { WalrusLink } from './WalrusLink';
import dynamic from 'next/dynamic';
import { CheckCircle2, AlertCircle, Zap, ShieldCheck, Share2, Check, Code, Copy, Lightbulb } from 'lucide-react';
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
    contractHash?: string;
    findingsJson: AuditFinding[];
    summaryJson: AuditSummary & {
      gasAnalysis?: GasAnalysis;
      overallRecommendations?: string[];
    };
  };
}

const BADGE_COLORS: Record<string, string> = {
  CLEAN: '#16a34a',
  LOW: '#84cc16',
  MEDIUM: '#ca8a04',
  HIGH: '#dc2626',
  CRITICAL: '#7f1d1d',
};

function AuditBadge({ risk }: { risk: string }) {
  const color = BADGE_COLORS[risk] ?? BADGE_COLORS.MEDIUM;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="20" role="img" aria-label={`MoveAuditor: ${risk}`} className="shrink-0">
      <title>MoveAuditor: {risk}</title>
      <linearGradient id="badge-s" x2="0" y2="100%">
        <stop offset="0" stopColor="#bbb" stopOpacity=".1" />
        <stop offset="1" stopOpacity=".1" />
      </linearGradient>
      <clipPath id="badge-r">
        <rect width="200" height="20" rx="3" fill="#fff" />
      </clipPath>
      <g clipPath="url(#badge-r)">
        <rect width="120" height="20" fill="#555" />
        <rect x="120" width="80" height="20" fill={color} />
        <rect width="200" height="20" fill="url(#badge-s)" />
      </g>
      <g fill="#fff" textAnchor="middle" fontFamily="Courier New, monospace" fontSize="11" fontWeight="bold">
        <text x="60" y="14">MoveAuditor</text>
        <text x="160" y="14">{risk}</text>
      </g>
    </svg>
  );
}

export function ReportViewer({ audit }: ReportViewerProps) {
  const { summaryJson: summary, findingsJson: findings } = audit;
  const isClean = audit.overallRisk === 'CLEAN';
  const [copied, setCopied] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  React.useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyBadge = async () => {
    const badgeUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/badge/${audit.blobId}`;
    const markdown = `[![MoveAuditor](${badgeUrl})](${currentUrl})`;
    await navigator.clipboard.writeText(markdown);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
  };

  const handleCopyHash = async () => {
    if (!audit.contractHash) return;
    await navigator.clipboard.writeText(audit.contractHash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  const SEVERITY_COUNTS = [
    { label: 'Critical', count: audit.criticalCount, color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/15' },
    { label: 'High', count: audit.highCount, color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/15' },
    { label: 'Medium', count: audit.mediumCount, color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15' },
    { label: 'Low', count: audit.lowCount, color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/15' },
    { label: 'Info', count: audit.infoCount, color: 'text-zinc-400', bg: 'bg-zinc-500/8', border: 'border-zinc-500/15' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-lg surface p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 animate-fadeIn">
        <div>
          <h1 className="text-xl font-bold text-white mb-1.5">{audit.contractName}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>
              <span className="text-zinc-400">Audited:</span>{' '}
              {new Date(audit.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </span>
            <span className="text-zinc-700">•</span>
            <span>{summary.moduleCount} modules</span>
            <span className="text-zinc-700">•</span>
            <span>{summary.lineCount} lines</span>
            {audit.contractHash && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                  {audit.contractHash.substring(0, 10)}...{audit.contractHash.substring(audit.contractHash.length - 8)}
                  <button onClick={handleCopyHash} className="hover:text-white transition-colors" title="Copy full hash">
                    {hashCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <RiskBadge level={audit.overallRisk} />
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Severity counts */}
      <div className="flex flex-wrap gap-2 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        {SEVERITY_COUNTS.map((s) => (
          <div
            key={s.label}
            className={`px-3 py-1.5 ${s.bg} border ${s.border} rounded-md flex items-center gap-1.5`}
          >
            <span className={`font-semibold text-sm ${s.color}`}>{s.count}</span>
            <span className={`text-xs ${s.color}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Executive Summary */}
      <div className="rounded-lg surface p-5 animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
        <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          Executive Summary
        </h2>
        {isClean ? (
          <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-lg p-5 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-emerald-400 mb-1.5">No Vulnerabilities Found</h3>
            <p className="text-xs text-emerald-300/60 max-w-lg mx-auto leading-relaxed">{summary.executiveSummary}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 leading-relaxed">{summary.executiveSummary}</p>
        )}
      </div>

      {/* Badge embed */}
      {audit.blobId && (
        <div className="rounded-lg surface p-5 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              Embeddable Badge
            </h2>
            <span className="text-[11px] text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full border border-zinc-700/50">
              README ready
            </span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Drop this into your GitHub README to show your contract's audit status.
          </p>

          {/* Preview row */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] text-zinc-600 shrink-0">Preview</span>
            <div className="h-px flex-1 bg-zinc-800" />
            <AuditBadge risk={audit.overallRisk} />
          </div>

          {/* Markdown snippet */}
          <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/40">
              <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Markdown</span>
              <button
                onClick={handleCopyBadge}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  badgeCopied
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 border border-zinc-700'
                }`}
              >
                {badgeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {badgeCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="px-4 py-3 text-[11px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {`[![MoveAuditor](${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/badge/${audit.blobId})](${currentUrl})`}
            </pre>
          </div>
        </div>
      )}

      {/* Findings */}
      {!isClean && findings && findings.length > 0 && (
        <div className="space-y-5 animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <SeverityChart findings={findings} />

          <div>
            <h2 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Detailed Findings ({findings.length})
            </h2>
            <div className="space-y-2">
              {findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gas Analysis */}
      {summary.gasAnalysis && (
        <div className="rounded-lg surface p-5">
          <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Gas & Optimization
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mb-2">Expensive Patterns</h3>
              <ul className="space-y-1.5">
                {summary.gasAnalysis.expensivePatterns.map((item, i) => (
                  <li key={i} className="text-xs text-red-400/70 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span> {item}
                  </li>
                ))}
                {summary.gasAnalysis.expensivePatterns.length === 0 && (
                  <li className="text-xs text-zinc-600">None detected.</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mb-2">Suggestions</h3>
              <ul className="space-y-1.5">
                {summary.gasAnalysis.optimizationSuggestions.map((item, i) => (
                  <li key={i} className="text-xs text-emerald-400/70 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">✓</span> {item}
                  </li>
                ))}
                {summary.gasAnalysis.optimizationSuggestions.length === 0 && (
                  <li className="text-xs text-zinc-600">No suggestions.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {summary.overallRecommendations && summary.overallRecommendations.length > 0 && (
        <div className="rounded-lg surface p-5">
          <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
            Recommendations
          </h2>
          <ul className="space-y-2">
            {summary.overallRecommendations.map((rec, i) => (
              <li key={i} className="text-xs text-zinc-400 flex items-start gap-2.5">
                <span className="bg-zinc-800 text-zinc-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-[10px] font-semibold mt-0.5">
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
        <WalrusLink blobId={audit.blobId} walrusUrl={audit.walrusUrl} />
      )}
    </div>
  );
}
