'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Wrench, Code2, Lightbulb } from 'lucide-react';
import { AuditFinding } from '@sui-audit-ai/shared-types';
import { RiskBadge } from './RiskBadge';

interface FindingCardProps {
  finding: AuditFinding;
}

export function FindingCard({ finding }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg surface overflow-hidden transition-all duration-200">
      <div
        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.015] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <RiskBadge level={finding.severity} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm text-white font-medium flex items-center gap-2">
              <span className="text-zinc-600 text-[11px] font-mono">{finding.id}</span>
              <span className="truncate">{finding.title}</span>
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-600">
              <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-500 text-[10px]">
                {finding.category.replace(/_/g, ' ')}
              </span>
              <span>•</span>
              <span className="font-mono truncate">
                {finding.location.module}
                {finding.location.function ? `::${finding.location.function}` : ''}
              </span>
              <span>•</span>
              <span>{finding.location.lineHint}</span>
            </div>
          </div>
        </div>
        <div className="ml-2 shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          )}
        </div>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3.5 pt-0 border-t border-zinc-800/40 mt-1 space-y-3">
            <p className="text-xs text-zinc-400 leading-relaxed">{finding.description}</p>

            {/* Impact */}
            <div className="bg-red-500/[0.04] border border-red-500/10 rounded-lg p-3">
              <h4 className="flex items-center gap-1.5 text-red-400 text-xs font-medium mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Impact
              </h4>
              <p className="text-[11px] text-red-300/60 leading-relaxed">{finding.impact}</p>
            </div>

            {/* Recommendation */}
            <div className="bg-blue-500/[0.04] border border-blue-500/10 rounded-lg p-3">
              <h4 className="flex items-center gap-1.5 text-blue-400 text-xs font-medium mb-1">
                <Wrench className="w-3.5 h-3.5" />
                Recommendation
              </h4>
              <p className="text-[11px] text-blue-300/60 leading-relaxed">{finding.recommendation}</p>
            </div>

            {/* Attack vector */}
            {finding.attackVector && (
              <div className="bg-orange-500/[0.04] border border-orange-500/10 rounded-lg p-3">
                <h4 className="flex items-center gap-1.5 text-orange-400 text-xs font-medium mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Attack Vector
                </h4>
                <p className="text-[11px] text-orange-300/60 leading-relaxed">{finding.attackVector}</p>
              </div>
            )}

            {/* Refined recommendation */}
            {finding.refinedRecommendation && (
              <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-lg p-3">
                <h4 className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium mb-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Refined Recommendation
                </h4>
                <p className="text-[11px] text-emerald-300/60 leading-relaxed">{finding.refinedRecommendation}</p>
              </div>
            )}

            {/* Code snippet */}
            {finding.codeSnippet && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-x-auto">
                <h4 className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium mb-2">
                  <Code2 className="w-3.5 h-3.5" />
                  Code Snippet
                </h4>
                <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                  <code>{finding.codeSnippet}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
