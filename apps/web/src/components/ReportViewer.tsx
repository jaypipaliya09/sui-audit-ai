'use client';

import React, { useState } from 'react';
import { FindingCard } from './FindingCard';
import { RiskBadge } from './RiskBadge';
import { WalrusLink } from './WalrusLink';
import dynamic from 'next/dynamic';
import { CheckCircle2, AlertCircle, Zap, ShieldCheck, Share2, Check, Code, Copy, Lightbulb } from 'lucide-react';
import { AuditFinding, GasAnalysis, AuditSummary } from '@sui-audit-ai/shared-types';
import { copyText } from '@/lib/clipboard';

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
    if (await copyText(window.location.href)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyBadge = async () => {
    const badgeUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/badge/${audit.blobId}`;
    const markdown = `[![MoveAuditor](${badgeUrl})](${currentUrl})`;
    if (await copyText(markdown)) {
      setBadgeCopied(true);
      setTimeout(() => setBadgeCopied(false), 2000);
    }
  };

  const handleCopyHash = async () => {
    if (!audit.contractHash) return;
    if (await copyText(audit.contractHash)) {
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
    }
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
      <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row md:items-start justify-between gap-5 animate-fadeIn border border-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
        <div>
          <h1 className="text-2xl font-display font-medium text-ivory mb-2 tracking-tight">{audit.contractName}</h1>
          <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
              Audited{' '}
              {new Date(audit.createdAt).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </span>
            <span className="text-zinc-600">•</span>
            <span>{summary.moduleCount} modules</span>
            <span className="text-zinc-600">•</span>
            <span>{summary.lineCount} lines</span>
            {audit.contractHash && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-2 font-mono text-[11px] bg-white/[0.03] border border-white/[0.05] px-2.5 py-1 rounded-md text-zinc-300">
                  {audit.contractHash.substring(0, 10)}...{audit.contractHash.substring(audit.contractHash.length - 8)}
                  <button onClick={handleCopyHash} className="p-1 hover:bg-white/5 rounded text-zinc-500 hover:text-emerald-400 transition-colors" title="Copy full hash">
                    {hashCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <RiskBadge level={audit.overallRisk} />
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 hover:text-ivory text-[13px] font-medium transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Severity counts */}
      <div className="flex flex-wrap gap-2 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        {SEVERITY_COUNTS.map((s) => (
          <div
            key={s.label}
            className={`px-3 py-1.5 ${s.bg} border ${s.border} rounded-lg flex items-center gap-2 shadow-sm`}
          >
            <span className={`font-bold text-[15px] ${s.color}`}>{s.count}</span>
            <span className={`text-[13px] font-medium tracking-wide uppercase ${s.color} opacity-80`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Executive Summary */}
      <div className="glass-panel p-6 sm:p-8 animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
        <h2 className="text-[13px] font-bold text-indigo-400/90 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Executive Summary
        </h2>
        {isClean ? (
          <div className="bg-emerald-500/[0.03] border border-emerald-500/20 rounded-xl p-8 text-center shadow-[inset_0_0_40px_rgba(16,185,129,0.03)]">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h3 className="text-xl font-display font-medium text-emerald-300 mb-2">No Vulnerabilities Found</h3>
            <p className="text-[15px] text-emerald-100/60 max-w-xl mx-auto leading-relaxed font-light">{summary.executiveSummary}</p>
          </div>
        ) : (
          <p className="text-[15px] text-zinc-300 leading-relaxed font-light">{summary.executiveSummary}</p>
        )}
      </div>

      {/* Badge embed */}
      {audit.blobId && (
        <div className="glass-panel p-6 sm:p-8 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold text-blue-400/90 uppercase tracking-[0.15em] flex items-center gap-2">
              <Code className="w-4 h-4" />
              Embeddable Badge
            </h2>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.05]">
              README ready
            </span>
          </div>
          <p className="text-[13px] text-zinc-400 mb-5">
            Drop this into your GitHub README to proudly display your security posture.
          </p>

          {/* Preview row */}
          <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-obsidian border border-white/[0.04]">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 shrink-0">Preview</span>
            <div className="h-px flex-1 bg-gradient-to-r from-white/[0.02] via-white/[0.08] to-white/[0.02]" />
            <div className="drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <AuditBadge risk={audit.overallRisk} />
            </div>
          </div>

          {/* Markdown snippet */}
          <div className="relative rounded-xl border border-white/[0.06] bg-obsidian overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-[#0a0a0c]/80 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Markdown</span>
              <button
                onClick={handleCopyBadge}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all ${
                  badgeCopied
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/[0.03] text-zinc-400 hover:text-ivory hover:bg-white/[0.06] border border-white/[0.05]'
                }`}
              >
                {badgeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {badgeCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="px-5 py-4 text-[12px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {`[![MoveAuditor](${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/badge/${audit.blobId})](${currentUrl})`}
            </pre>
          </div>
        </div>
      )}

      {/* Findings */}
      {!isClean && findings && findings.length > 0 && (
        <div className="space-y-6 animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="glass-panel p-6">
            <SeverityChart findings={findings} />
          </div>

          <div>
            <h2 className="text-[13px] font-bold text-red-400/90 uppercase tracking-[0.15em] flex items-center gap-2 mb-4 ml-1">
              <AlertCircle className="w-4 h-4" />
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

      {/* Gas Analysis */}
      {summary.gasAnalysis && (
        <div className="glass-panel p-6 sm:p-8 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-[13px] font-bold text-amber-400/90 uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Gas & Optimization
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/[0.01] rounded-xl p-5 border border-white/[0.03]">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Expensive Patterns</h3>
              <ul className="space-y-2.5">
                {summary.gasAnalysis.expensivePatterns.map((item, i) => (
                  <li key={i} className="text-[13px] text-red-400/80 flex items-start gap-3">
                    <span className="text-red-500/80 mt-0.5 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
                {summary.gasAnalysis.expensivePatterns.length === 0 && (
                  <li className="text-[13px] text-zinc-600 italic">None detected.</li>
                )}
              </ul>
            </div>
            <div className="bg-white/[0.01] rounded-xl p-5 border border-white/[0.03]">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Suggestions</h3>
              <ul className="space-y-2.5">
                {summary.gasAnalysis.optimizationSuggestions.map((item, i) => (
                  <li key={i} className="text-[13px] text-emerald-400/80 flex items-start gap-3">
                    <span className="text-emerald-500/80 mt-0.5 font-bold">✓</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
                {summary.gasAnalysis.optimizationSuggestions.length === 0 && (
                  <li className="text-[13px] text-zinc-600 italic">No suggestions.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {summary.overallRecommendations && summary.overallRecommendations.length > 0 && (
        <div className="glass-panel p-6 sm:p-8 animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
          <h2 className="text-[13px] font-bold text-indigo-400/90 uppercase tracking-[0.15em] mb-5 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Recommendations
          </h2>
          <ul className="space-y-3">
            {summary.overallRecommendations.map((rec, i) => (
              <li key={i} className="text-[14px] text-zinc-300 flex items-start gap-4">
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
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
