'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { RiskBadge } from '@/components/RiskBadge';
import {
  Loader2, DollarSign, Users, BarChart3, Activity,
  AlertTriangle, Clock, TrendingUp, Zap, Shield,
  Database, Check
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DashboardMetrics {
  mrr: number;
  newSubscriptionsToday: number;
  churnedSubscriptionsThisMonth: number;
  auditsToday: number;
  auditsThisMonth: number;
  avgAuditLatencyMs: number;
  claudeCostToday: number;
  claudeCostThisMonth: number;
  grossMarginPercent: number;
  avgFindingsPerAudit: number;
  criticalFindingsThisMonth: number;
  queueDepth: number;
  failedAuditsToday: number;
  walrusSuccessRateToday: number;
}

export default function AdminPage() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!authLoading && user && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      router.push('/dashboard');
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!token) return;

    if (activeTab === 'overview') {
      const headers = { Authorization: `Bearer ${token}` };
      Promise.all([
        fetch(`${API_URL}/admin/metrics`, { headers }).then((r) => r.json()),
        fetch(`${API_URL}/admin/audits?limit=10`, { headers }).then((r) => r.json()),
      ])
        .then(([m, a]) => {
          setMetrics(m);
          setAudits(a.data || []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (activeTab === 'users') {
      setUsersLoading(true);
      api.getAdminUsers(1, 50)
        .then((res) => setAdminUsers(res.data || []))
        .catch((err) => setError(err.message))
        .finally(() => setUsersLoading(false));
    }
  }, [token, activeTab]);

  const handlePlanChange = async (userId: string, plan: string) => {
    try {
      await api.updateUserPlan(userId, plan);
      setAdminUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, subscription: { plan } } : u)
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update plan');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">Access Denied</h2>
          <p className="text-xs text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  const METRIC_CARDS = metrics ? [
    { label: 'MRR', value: `$${metrics.mrr.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
    { label: 'Audits Today', value: metrics.auditsToday.toString(), icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-500/8', border: 'border-indigo-500/15' },
    { label: 'Audits (Month)', value: metrics.auditsThisMonth.toString(), icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/15' },
    { label: 'Claude Cost Today', value: `$${metrics.claudeCostToday.toFixed(2)}`, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15' },
    { label: 'Claude Cost (Month)', value: `$${metrics.claudeCostThisMonth.toFixed(2)}`, icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/15' },
    { label: 'Gross Margin', value: `${metrics.grossMarginPercent}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
    { label: 'Queue Depth', value: metrics.queueDepth.toString(), icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/8', border: 'border-purple-500/15' },
    { label: 'Failed Today', value: metrics.failedAuditsToday.toString(), icon: AlertTriangle, color: metrics.failedAuditsToday > 0 ? 'text-red-400' : 'text-zinc-500', bg: metrics.failedAuditsToday > 0 ? 'bg-red-500/8' : 'bg-zinc-500/8', border: metrics.failedAuditsToday > 0 ? 'border-red-500/15' : 'border-zinc-500/15' },
    { label: 'Walrus Success', value: `${metrics.walrusSuccessRateToday}%`, icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/8', border: 'border-cyan-500/15' },
    { label: 'Avg Latency', value: `${(metrics.avgAuditLatencyMs / 1000).toFixed(1)}s`, icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-500/8', border: 'border-zinc-500/15' },
    { label: 'Avg Findings', value: metrics.avgFindingsPerAudit.toString(), icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15' },
    { label: 'Criticals (Month)', value: metrics.criticalFindingsThisMonth.toString(), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/15' },
  ] : [];

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              Admin Dashboard
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Internal metrics and operations.</p>
          </div>
          <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
            {(['overview', 'users'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  activeTab === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {METRIC_CARDS.map((card) => (
                <div
                  key={card.label}
                  className={`${card.bg} border ${card.border} rounded-lg p-4 transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                    <span className="text-[11px] text-zinc-500 font-medium">{card.label}</span>
                  </div>
                  <div className="text-xl font-bold text-white">{card.value}</div>
                </div>
              ))}
            </div>

            {/* Recent audits table */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Recent Audits
              </h3>
              {audits.length > 0 ? (
                <div className="rounded-lg surface overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800/50">
                        <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Contract</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">User</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Risk</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Status</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Cost</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((audit: any) => (
                        <tr key={audit.id} className="border-b border-zinc-800/30 last:border-0 hover:bg-white/[0.015] transition-colors">
                          <td className="px-4 py-3 text-sm text-white font-medium truncate max-w-[180px]">
                            {audit.contractName || 'Untitled'}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">
                            {audit.user?.email || audit.userId?.slice(0, 8) || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <RiskBadge level={audit.overallRisk || audit.status || 'INFO'} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${
                              audit.status === 'COMPLETE' ? 'text-emerald-400' :
                              audit.status === 'FAILED' ? 'text-red-400' :
                              'text-amber-400'
                            }`}>
                              {audit.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 text-right font-mono">
                            ${(audit.claudeCost || 0).toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500 text-right font-mono">
                            {audit.claudeLatencyMs ? `${(audit.claudeLatencyMs / 1000).toFixed(1)}s` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 rounded-lg surface">
                  <Shield className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
                  <p className="text-sm text-zinc-600">No audits recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="rounded-lg surface overflow-hidden animate-fadeIn">
            {usersLoading ? (
              <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
            ) : adminUsers.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/50">
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Role</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Joined</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Audits</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u: any) => (
                    <tr key={u.id} className="border-b border-zinc-800/30 last:border-0 hover:bg-white/[0.015]">
                      <td className="px-4 py-3">
                        <div className="text-sm text-white font-medium">{u.name}</div>
                        <div className="text-[11px] text-zinc-600">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{u.role}</td>
                      <td className="px-4 py-3 text-xs text-zinc-600">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 text-right">
                        {u._count?.audits || 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={u.subscription?.plan || 'FREE'}
                          onChange={(e) => handlePlanChange(u.id, e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="FREE">FREE</option>
                          <option value="DEVELOPER">DEVELOPER</option>
                          <option value="TEAM">TEAM</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-zinc-600 text-sm">No users found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
