import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Wrench, Code2 } from 'lucide-react';
import { AuditFinding } from '@sui-audit-ai/shared-types';
import { RiskBadge } from './RiskBadge';

interface FindingCardProps {
  finding: AuditFinding;
}

export function FindingCard({ finding }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-[#1e1e1e] border border-gray-800 rounded-lg overflow-hidden transition-all duration-300">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <RiskBadge level={finding.severity} />
          <div className="flex-1">
            <h3 className="text-white font-medium flex items-center gap-2">
              <span className="text-gray-500 text-sm">{finding.id}</span>
              {finding.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span className="bg-gray-800 px-2 py-0.5 rounded-md text-gray-300">
                {finding.category.replace(/_/g, ' ')}
              </span>
              <span>•</span>
              <span className="font-mono">
                {finding.location.module}
                {finding.location.function ? `::${finding.location.function}` : ''}
              </span>
              <span>•</span>
              <span>{finding.location.lineHint}</span>
            </div>
          </div>
        </div>
        <div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0 border-t border-gray-800 mt-2 space-y-4">
            
            <div>
              <p className="text-gray-300 text-sm leading-relaxed">{finding.description}</p>
            </div>

            <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
              <h4 className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                <AlertTriangle className="w-4 h-4" />
                Impact
              </h4>
              <p className="text-red-200/80 text-sm">{finding.impact}</p>
            </div>

            <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-3">
              <h4 className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-1">
                <Wrench className="w-4 h-4" />
                Recommendation
              </h4>
              <p className="text-blue-200/80 text-sm">{finding.recommendation}</p>
            </div>

            {finding.codeSnippet && (
              <div className="bg-black/50 border border-gray-800 rounded-lg p-3 overflow-x-auto">
                <h4 className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-2">
                  <Code2 className="w-4 h-4" />
                  Code Snippet
                </h4>
                <pre className="text-sm font-mono text-gray-300">
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
