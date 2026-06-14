'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { RiskBadge } from '@/components/RiskBadge';
import { Loader2, ArrowRight, CheckCircle2, AlertTriangle, Info, PlusCircle, MinusCircle } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
      setError('Please provide both previous and current audit IDs in the URL query.');
      setLoading(false);
      return;
    }

    if (authLoading) return;
    if (!isAuthenticated) {
      setError('Please log in to compare audits.');
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/audit/compare?previous=${prevId}&current=${currId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch comparison');
        return r.json();
      })
      .then(data => {
        setDiff(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [prevId, currId, token, isAuthenticated, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-400">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        <p>{error}</p>
      </div>
    );
  }

  if (!diff) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Audit Comparison</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="font-mono text-xs">{prevId?.slice(0, 8)}</span>
          <ArrowRight className="w-4 h-4" />
          <span className="font-mono text-xs">{currId?.slice(0, 8)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-sm text-gray-500 mb-2">Overall Trend</span>
          {diff.riskChange === 'IMPROVED' ? (
            <div className="flex items-center gap-2 text-green-400 font-bold text-lg">
              <CheckCircle2 className="w-6 h-6" /> Improved
            </div>
          ) : diff.riskChange === 'REGRESSED' ? (
            <div className="flex items-center gap-2 text-red-400 font-bold text-lg">
              <AlertTriangle className="w-6 h-6" /> Regressed
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400 font-bold text-lg">
              <Info className="w-6 h-6" /> Unchanged
            </div>
          )}
        </div>

        <div className="bg-[#1a1a1a] border border-green-500/20 p-6 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-sm text-green-500/70 mb-2">Fixed Issues</span>
          <div className="text-3xl font-bold text-green-400 flex items-center gap-2">
            <MinusCircle className="w-6 h-6" /> {diff.fixedCount}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-red-500/20 p-6 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-sm text-red-500/70 mb-2">New Issues (Regressions)</span>
          <div className="text-3xl font-bold text-red-400 flex items-center gap-2">
            <PlusCircle className="w-6 h-6" /> {diff.regressedCount}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* New Issues */}
        {diff.regressed.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-red-500/20 pb-2 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-red-400" /> New Findings
            </h3>
            <div className="space-y-3">
              {diff.regressed.map((f, i) => (
                <div key={i} className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-white mb-1">{f.title}</h4>
                    <p className="text-sm text-gray-400">{f.location.module}::{f.location.function}</p>
                  </div>
                  <RiskBadge level={f.severity} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixed Issues */}
        {diff.fixed.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-green-500/20 pb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" /> Resolved Findings
            </h3>
            <div className="space-y-3">
              {diff.fixed.map((f, i) => (
                <div key={i} className="bg-green-500/5 border border-green-500/10 p-4 rounded-xl flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-300 line-through mb-1">{f.title}</h4>
                    <p className="text-sm text-gray-500">{f.location.module}::{f.location.function}</p>
                  </div>
                  <RiskBadge level={f.severity} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unchanged Issues */}
        {diff.unchanged.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-[#2a2a2a] pb-2 flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-500" /> Unchanged Findings
            </h3>
            <div className="space-y-3">
              {diff.unchanged.map((f, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-xl flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-300 mb-1">{f.title}</h4>
                    <p className="text-sm text-gray-500">{f.location.module}::{f.location.function}</p>
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
