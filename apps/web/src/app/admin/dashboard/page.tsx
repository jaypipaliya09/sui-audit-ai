'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Loader2, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import {
  MetricCards, UsageCharts, type DashboardMetrics, type UsageStats, type Granularity,
} from '@/components/admin/AdminUI';

const GRANULARITIES: Granularity[] = ['day', 'month', 'year'];
const PLANS = ['FREE', 'DEVELOPER', 'TEAM', 'ENTERPRISE'];
const STATUSES = ['QUEUED', 'ANALYZING', 'STORING', 'COMPLETE', 'FAILED'];
const RISKS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAN'];

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [granularity, setGranularity] = useState<Granularity>('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [risk, setRisk] = useState('');

  // Metrics load once.
  useEffect(() => {
    if (!token) return;
    api.getAdminMetrics().then(setMetrics).catch((e) => setError(e.message));
  }, [token]);

  // Usage reloads when filters change.
  const loadUsage = useCallback(() => {
    if (!token) return;
    setUsageLoading(true);
    api.getAdminUsage({ granularity, from, to, plan, status, risk })
      .then(setUsage)
      .catch((e) => setError(e.message))
      .finally(() => setUsageLoading(false));
  }, [token, granularity, from, to, plan, status, risk]);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  const resetFilters = () => {
    setFrom(''); setTo(''); setPlan(''); setStatus(''); setRisk('');
  };

  if (error) {
    return (
      <div className="py-20 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  const selectClass = 'bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md px-2 py-1.5 focus:border-indigo-500 focus:outline-none';

  return (
    <div className="space-y-6">
      {metrics ? <MetricCards metrics={metrics} /> : (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
      )}

      {/* Filter bar */}
      <div className="rounded-lg surface p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          Statistics filters
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Granularity segmented control */}
          <div className="flex bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                  granularity === g ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} />
          </label>

          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={selectClass}>
            <option value="">All plans</option>
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className={selectClass}>
            <option value="">All risks</option>
            {RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          {(from || to || plan || status || risk) && (
            <button onClick={resetFilters} className="text-[11px] text-indigo-400 hover:text-indigo-300">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Charts */}
      {usageLoading || !usage ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
      ) : (
        <UsageCharts usage={usage} />
      )}
    </div>
  );
}
