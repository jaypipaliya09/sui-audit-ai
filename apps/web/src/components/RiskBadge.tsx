'use client';

import React from 'react';

const RISK_CONFIG: Record<string, { label: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
  CRITICAL: { label: 'Critical', dotColor: 'bg-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/8', borderColor: 'border-red-500/20' },
  HIGH:     { label: 'High',     dotColor: 'bg-orange-500', textColor: 'text-orange-400', bgColor: 'bg-orange-500/8', borderColor: 'border-orange-500/20' },
  MEDIUM:   { label: 'Medium',   dotColor: 'bg-amber-500', textColor: 'text-amber-400', bgColor: 'bg-amber-500/8', borderColor: 'border-amber-500/20' },
  LOW:      { label: 'Low',      dotColor: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/8', borderColor: 'border-emerald-500/20' },
  CLEAN:    { label: 'Clean',    dotColor: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/8', borderColor: 'border-emerald-500/20' },
  INFO:     { label: 'Info',     dotColor: 'bg-blue-500', textColor: 'text-blue-400', bgColor: 'bg-blue-500/8', borderColor: 'border-blue-500/20' },
  COMPLETE: { label: 'Complete', dotColor: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/8', borderColor: 'border-emerald-500/20' },
  FAILED:   { label: 'Failed',   dotColor: 'bg-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/8', borderColor: 'border-red-500/20' },
  PENDING:  { label: 'Pending',  dotColor: 'bg-zinc-500', textColor: 'text-zinc-400', bgColor: 'bg-zinc-500/8', borderColor: 'border-zinc-500/20' },
};

interface RiskBadgeProps {
  level: string;
  className?: string;
  showDot?: boolean;
}

export function RiskBadge({ level, className = '', showDot = true }: RiskBadgeProps) {
  const config = RISK_CONFIG[level?.toUpperCase()] || RISK_CONFIG.INFO;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium
        ${config.bgColor} ${config.borderColor} ${config.textColor} border
        ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />}
      {config.label}
    </span>
  );
}
