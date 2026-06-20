'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import {
  PlusCircle, Clock, ArrowRight, BarChart3,
  Shield, Loader2, GitBranch, FileCode2, TrendingUp, Zap
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({ used: 0, limit: 50, resetDate: '' });

  useEffect(() => {
    Promise.all([
      api.getReports(1, 10).catch(() => ({ data: [], total: 0 })),
      api.getSubscriptionStatus().catch(() => null),
    ]).then(([reports, sub]) => {
      setAudits(reports.data || []);
      if (sub) {
        setUsage({
          used: sub.auditsUsedThisPeriod || 0,
          limit: sub.auditsLimit || 50,
          resetDate: sub.currentPeriodEnd || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const usagePct = Math.min((usage.used / usage.limit) * 100, 100);
  const remaining = Math.max(usage.limit - usage.used, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-medium text-ivory tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Here&apos;s your audit overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="btn-secondary text-xs py-2 px-3">
            <FileCode2 className="w-3.5 h-3.5" />
            Single Audit
          </Link>
          <Link href="/" className="btn-primary text-xs py-2 px-3">
            <GitBranch className="w-3.5 h-3.5" />
            Repo Audit
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Usage */}
        <div className="glass-panel p-4 animate-fadeInUp hover:-translate-y-0.5 transition-transform duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-jade-500/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-jade-400" />
              </div>
              <span className="text-xs font-medium text-zinc-400">Monthly Usage</span>
            </div>
            <span className="text-xs text-zinc-600">{usage.used}/{usage.limit}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                usagePct > 80 ? 'bg-red-500' : usagePct > 60 ? 'bg-amber-500' : 'bg-jade-500'
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {usage.resetDate && (
            <p className="text-[11px] text-zinc-700 mt-2">
              Resets {new Date(usage.resetDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Remaining */}
        <div className="glass-panel p-4 animate-fadeInUp hover:-translate-y-0.5 transition-transform duration-300" style={{ animationDelay: '0.08s' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-zinc-400">Remaining</span>
          </div>
          <p className="text-2xl font-bold text-white">{remaining}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">audits available</p>
        </div>

        {/* Plan */}
        <div className="glass-panel p-4 animate-fadeInUp hover:-translate-y-0.5 transition-transform duration-300" style={{ animationDelay: '0.16s' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-zinc-400">Current Plan</span>
          </div>
          <p className="text-2xl font-bold text-white">{user?.plan || 'FREE'}</p>
        </div>
      </div>

      {/* Recent Audits */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            Recent Audits
          </h3>
          <Link href="/history" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : audits.length > 0 ? (
          <div className="rounded-lg surface overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Contract</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Risk</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Date</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {audits.slice(0, 5).map((audit: any) => (
                  <tr key={audit.id} className="border-b border-zinc-800/30 last:border-0 hover:bg-white/[0.015] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-white font-medium">{audit.contractName || 'Untitled'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={audit.overallRisk || audit.status || 'INFO'} />
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {audit.blobId ? (
                        <Link
                          href={`/report/${audit.blobId}`}
                          className="text-xs text-jade-400 hover:text-jade-300 font-medium transition-colors"
                        >
                          View →
                        </Link>
                      ) : (
                        <span className="text-xs text-zinc-600">Processing...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 rounded-lg surface">
            <Shield className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
            <p className="text-sm text-zinc-600 mb-2">No audits yet</p>
            <Link href="/" className="text-xs text-jade-400 hover:text-jade-300 transition-colors">
              Run your first audit →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
