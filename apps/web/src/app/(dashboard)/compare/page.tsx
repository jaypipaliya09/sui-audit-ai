'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import { Loader2, ArrowRight, CheckCircle2, AlertTriangle, Info, PlusCircle, MinusCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface AuditDiff {
  fixed: any[];
  regressed: any[];
  unchanged: any[];
  riskChange: 'IMPROVED' | 'REGRESSED' | 'UNCHANGED';
  fixedCount: number;
  regressedCount: number;
}

export default function ComparePage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const prevId = searchParams.get('previous');
  const currId = searchParams.get('current');

  const [diff, setDiff] = useState<AuditDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!prevId || !currId) {
      setError('Please provide both previous and current audit IDs.');
      setLoading(false);
      return;
    }
    if (authLoading) return;
    if (!isAuthenticated) {
      setError('Please log in to compare audits.');
      setLoading(false);
      return;
    }

    api.compareAudits(prevId, currId)
      .then((data) => { setDiff(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [prevId, currId, token, isAuthenticated, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  if (!diff) return null;

  return (
    <div className="max-w-4xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-lg font-semibold text-white mb-1">Audit Comparison</h1>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="font-mono bg-zinc-900 px-2 py-0.5 rounded">{prevId?.slice(0, 8)}</span>
          <ArrowRight className="w-3.5 h-3.5" />
          <span className="font-mono bg-zinc-900 px-2 py-0.5 rounded">{currId?.slice(0, 8)}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg surface p-5 flex flex-col items-center justify-center">
          <span className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider">Trend</span>
          {diff.riskChange === 'IMPROVED' ? (
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-base">
              <TrendingDown className="w-5 h-5" /> Improved
            </div>
          ) : diff.riskChange === 'REGRESSED' ? (
            <div className="flex items-center gap-2 text-red-400 font-semibold text-base">
              <TrendingUp className="w-5 h-5" /> Regressed
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400 font-semibold text-base">
              <Info className="w-5 h-5" /> Unchanged
            </div>
          )}
        </div>

        <div className="rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15 p-5 flex flex-col items-center justify-center">
          <span className="text-[11px] text-emerald-500/60 mb-2 uppercase tracking-wider">Fixed</span>
          <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <MinusCircle className="w-5 h-5" /> {diff.fixedCount}
          </div>
        </div>

        <div className="rounded-lg bg-red-500/[0.04] border border-red-500/15 p-5 flex flex-col items-center justify-center">
          <span className="text-[11px] text-red-500/60 mb-2 uppercase tracking-wider">New Issues</span>
          <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> {diff.regressedCount}
          </div>
        </div>
      </div>

      {/* Finding sections */}
      <div className="space-y-5">
        {diff.regressed.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2 pb-2 border-b border-red-500/15">
              <PlusCircle className="w-4 h-4 text-red-400" /> New Findings
            </h3>
            <div className="space-y-2">
              {diff.regressed.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-red-500/[0.04] border border-red-500/10">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-0.5">{f.title}</h4>
                    <p className="text-xs text-zinc-500">{f.location?.module}::{f.location?.function}</p>
                  </div>
                  <RiskBadge level={f.severity} />
                </div>
              ))}
            </div>
          </div>
        )}

        {diff.fixed.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2 pb-2 border-b border-emerald-500/15">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Resolved
            </h3>
            <div className="space-y-2">
              {diff.fixed.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 line-through mb-0.5">{f.title}</h4>
                    <p className="text-xs text-zinc-600">{f.location?.module}::{f.location?.function}</p>
                  </div>
                  <RiskBadge level={f.severity} />
                </div>
              ))}
            </div>
          </div>
        )}

        {diff.unchanged.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Info className="w-4 h-4 text-zinc-500" /> Unchanged
            </h3>
            <div className="space-y-2">
              {diff.unchanged.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg surface">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-0.5">{f.title}</h4>
                    <p className="text-xs text-zinc-600">{f.location?.module}::{f.location?.function}</p>
                  </div>
                  <RiskBadge level={f.severity} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
