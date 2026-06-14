'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { RiskBadge } from '@/components/RiskBadge';
import {
  Loader2, DollarSign, Users, BarChart3, Activity,
  AlertTriangle, Clock, TrendingUp, Zap, Shield,
  Database, ArrowRight, Settings, Check
} from 'lucide-react';
import { api } from '@/lib/api';

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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const METRIC_CARDS = metrics
    ? [
        { label: 'MRR', value: `$${metrics.mrr.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { label: 'Audits Today', value: metrics.auditsToday.toString(), icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
        { label: 'Audits This Month', value: metrics.auditsThisMonth.toString(), icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: 'Claude Cost Today', value: `$${metrics.claudeCostToday.toFixed(2)}`, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        { label: 'Claude Cost Month', value: `$${metrics.claudeCostThisMonth.toFixed(2)}`, icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
        { label: 'Gross Margin', value: `${metrics.grossMarginPercent}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'Queue Depth', value: metrics.queueDepth.toString(), icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        { label: 'Failed Today', value: metrics.failedAuditsToday.toString(), icon: AlertTriangle, color: metrics.failedAuditsToday > 0 ? 'text-red-400' : 'text-gray-500', bg: metrics.failedAuditsToday > 0 ? 'bg-red-500/10' : 'bg-gray-500/10', border: metrics.failedAuditsToday > 0 ? 'border-red-500/20' : 'border-gray-500/20' },
        { label: 'Walrus Success', value: `${metrics.walrusSuccessRateToday}%`, icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
        { label: 'Avg Latency', value: `${(metrics.avgAuditLatencyMs / 1000).toFixed(1)}s`, icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
        { label: 'Avg Findings', value: metrics.avgFindingsPerAudit.toString(), icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        { label: 'Criticals (Month)', value: metrics.criticalFindingsThisMonth.toString(), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-400" />
              Admin Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">Internal metrics and operations.</p>
          </div>
          <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-[#2a2a2a]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'users' ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Users
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {METRIC_CARDS.map((card) => (
            <div
              key={card.label}
              className={`${card.bg} border ${card.border} rounded-2xl p-4 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-xs text-gray-500 font-medium">{card.label}</span>
              </div>
              <div className="text-xl font-bold text-white">{card.value}</div>
            </div>
          ))}
        </div>

        {/* Recent Audits Table */}
        <div>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            Recent Audits
          </h3>
          {audits.length > 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contract</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Risk</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Latency</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit: any) => (
                    <tr key={audit.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm text-white font-medium truncate max-w-[200px]">
                        {audit.contractName || 'Untitled'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {audit.user?.email || audit.userId?.slice(0, 8) || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={audit.overallRisk || audit.status || 'INFO'} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          audit.status === 'COMPLETE' ? 'text-green-400' :
                          audit.status === 'FAILED' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {audit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right font-mono">
                        ${(audit.claudeCost || 0).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right font-mono">
                        {audit.claudeLatencyMs ? `${(audit.claudeLatencyMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(audit.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
              <Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">No audits recorded yet.</p>
            </div>
          )}
        </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {usersLoading ? (
             <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : adminUsers.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Audits</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u: any) => (
                  <tr key={u.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm text-white">
                      <div>{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{u.role}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 text-right">
                      {u._count?.audits || 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={u.subscription?.plan || 'FREE'}
                        onChange={(e) => handlePlanChange(u.id, e.target.value)}
                        className="bg-[#0f0f0f] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
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
             <div className="text-center py-12 text-gray-500 text-sm">No users found.</div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
