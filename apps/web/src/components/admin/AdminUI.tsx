'use client';

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  DollarSign, Users, BarChart3, Activity, AlertTriangle,
  Clock, Zap, Shield, Database, CreditCard, X, Loader2,
} from 'lucide-react';
import { RiskBadge } from '@/components/RiskBadge';

export type Granularity = 'day' | 'month' | 'year';

export interface DashboardMetrics {
  totalUsers: number;
  paidSubscriptions: number;
  totalAudits: number;
  auditsToday: number;
  auditsThisMonth: number;
  avgAuditLatencyMs: number;
  claudeCostToday: number;
  claudeCostThisMonth: number;
  avgFindingsPerAudit: number;
  criticalFindingsThisMonth: number;
  queueDepth: number;
  failedAuditsToday: number;
  walrusSuccessRateToday: number;
}

export interface UsageStats {
  granularity: Granularity;
  from: string;
  to: string;
  auditsOverTime: { date: string; count: number }[];
  newUsersOverTime: { date: string; count: number }[];
  findingsBySeverity: { severity: string; count: number }[];
  riskDistribution: { risk: string; count: number }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#3b82f6', Info: '#71717a',
};
const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#3b82f6', CLEAN: '#10b981',
};
const TOOLTIP_STYLE = {
  backgroundColor: '#18181b', border: '1px solid #27272a',
  borderRadius: '8px', fontSize: '12px', color: '#fff',
};

/** Shorten a Sui/Slush address for display, e.g. 0x7c2347…65a8. */
export function shortSui(addr?: string | null): string {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 8)}…${addr.slice(-4)}` : addr;
}

/** Friendly, short label for a user — never the raw synthetic email. */
export function userLabel(u: any): string {
  if (!u) return 'this user';
  if (u.name) return u.name;
  if (u.suiAddress) return shortSui(u.suiAddress);
  // Hide the long `<address>@sui-auth.local` synthetic emails.
  if (typeof u.email === 'string' && u.email.endsWith('@sui-auth.local')) {
    return shortSui(u.email.split('@')[0]) || 'this user';
  }
  return u.email || 'this user';
}

/** Format a bucket key ("2026", "2026-06", "2026-06-17") for the X axis. */
export function fmtPeriod(key: string, granularity: Granularity): string {
  const parts = key.split('-');
  if (granularity === 'year') return parts[0];
  if (granularity === 'month') {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MetricCards({ metrics }: { metrics: DashboardMetrics }) {
  const cards = [
    { label: 'Total Users', value: metrics.totalUsers.toLocaleString(), icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/8', border: 'border-indigo-500/15' },
    { label: 'Paid Plans', value: metrics.paidSubscriptions.toLocaleString(), icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
    { label: 'Total Audits', value: metrics.totalAudits.toLocaleString(), icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/15' },
    { label: 'Audits Today', value: metrics.auditsToday.toString(), icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/8', border: 'border-purple-500/15' },
    { label: 'Audits (Month)', value: metrics.auditsThisMonth.toString(), icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/8', border: 'border-blue-500/15' },
    { label: 'Cost Today', value: `$${metrics.claudeCostToday.toFixed(2)}`, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15' },
    { label: 'Cost (Month)', value: `$${metrics.claudeCostThisMonth.toFixed(2)}`, icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/15' },
    { label: 'Queue Depth', value: metrics.queueDepth.toString(), icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/8', border: 'border-purple-500/15' },
    { label: 'Failed Today', value: metrics.failedAuditsToday.toString(), icon: AlertTriangle, color: metrics.failedAuditsToday > 0 ? 'text-red-400' : 'text-zinc-500', bg: metrics.failedAuditsToday > 0 ? 'bg-red-500/8' : 'bg-zinc-500/8', border: metrics.failedAuditsToday > 0 ? 'border-red-500/15' : 'border-zinc-500/15' },
    { label: 'Walrus Success', value: `${metrics.walrusSuccessRateToday}%`, icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/8', border: 'border-cyan-500/15' },
    { label: 'Avg Latency', value: `${(metrics.avgAuditLatencyMs / 1000).toFixed(1)}s`, icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-500/8', border: 'border-zinc-500/15' },
    { label: 'Criticals (Month)', value: metrics.criticalFindingsThisMonth.toString(), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/15' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} border ${card.border} rounded-lg p-4 transition-all hover:scale-[1.01]`}>
          <div className="flex items-center gap-1.5 mb-2">
            <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            <span className="text-[11px] text-zinc-500 font-medium">{card.label}</span>
          </div>
          <div className="text-xl font-bold text-white">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg surface p-4">
      <h3 className="text-xs font-medium text-zinc-300 mb-4 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        {title}
      </h3>
      {children}
    </div>
  );
}

export function UsageCharts({ usage }: { usage: UsageStats }) {
  const g = usage.granularity;
  const fmt = (k: string) => fmtPeriod(k, g);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Audits over time" icon={Activity}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={usage.auditsOverTime} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="auditGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: '#71717a', fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(l) => fmt(String(l))} cursor={{ stroke: '#3f3f46' }} />
            <Area type="monotone" dataKey="count" name="Audits" stroke="#6366f1" strokeWidth={2} fill="url(#auditGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="New users over time" icon={Users}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={usage.newUsersOverTime} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: '#71717a', fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(l) => fmt(String(l))} cursor={{ stroke: '#3f3f46' }} />
            <Area type="monotone" dataKey="count" name="New users" stroke="#10b981" strokeWidth={2} fill="url(#userGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Findings by severity" icon={AlertTriangle}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={usage.findingsBySeverity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="severity" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }} />
            <Bar dataKey="count" name="Findings" radius={[4, 4, 0, 0]}>
              {usage.findingsBySeverity.map((d) => (
                <Cell key={d.severity} fill={SEVERITY_COLORS[d.severity] || '#71717a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Risk distribution" icon={Shield}>
        {usage.riskDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={usage.riskDistribution} dataKey="count" nameKey="risk" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} label={(e: any) => `${e.risk}: ${e.count}`} labelLine={false}>
                {usage.riskDistribution.map((d) => (
                  <Cell key={d.risk} fill={RISK_COLORS[d.risk] || '#71717a'} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-xs text-zinc-600">
            No completed audits in this range.
          </div>
        )}
      </ChartCard>
    </div>
  );
}

const PLAN_OPTIONS = ['FREE', 'DEVELOPER', 'TEAM', 'ENTERPRISE'];

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-zinc-600 uppercase tracking-wider">{label}</div>
      <div className={`text-xs text-zinc-300 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

export function UserDetailPanel({
  user, loading, onClose, onPlanChange, onToggleBlock, onDelete,
}: {
  user: any;
  loading: boolean;
  onClose: () => void;
  onPlanChange: (userId: string, plan: string) => void;
  onToggleBlock: (userId: string, isBlocked: boolean) => void;
  onDelete: (userId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-[#0c0c0e] border-l border-zinc-800 overflow-y-auto animate-slideInRight">
        <div className="sticky top-0 bg-[#0c0c0e]/90 backdrop-blur-sm border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">User Detail</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold">
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                  <span className={!user.name && user.suiAddress ? 'font-mono' : ''}>
                    {user.name || (user.suiAddress ? shortSui(user.suiAddress) : user.email)}
                  </span>
                  {user.isBlocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Blocked</span>}
                </div>
                <div className="text-xs text-zinc-500 truncate">{user.name ? user.email : (user.suiAddress ? 'Slush wallet' : user.email)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Meta label="Role" value={user.role} />
              <Meta label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} />
              <Meta label="Total audits" value={String(user._count?.audits ?? '—')} />
              <Meta label="Verified" value={user.emailVerified ? 'Yes' : 'No'} />
              {user.suiAddress && <Meta label="Sui address" value={`${user.suiAddress.slice(0, 10)}…`} mono />}
            </div>

            <div>
              <label className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Plan</label>
              <select
                value={user.subscription?.plan || 'FREE'}
                onChange={(e) => onPlanChange(user.id, e.target.value)}
                className="mt-1.5 w-full bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md px-2.5 py-2 focus:border-indigo-500 focus:outline-none"
              >
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onToggleBlock(user.id, !user.isBlocked)}
                className={`flex-1 text-xs font-medium rounded-md px-3 py-2 border transition-colors ${
                  user.isBlocked
                    ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                    : 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                {user.isBlocked ? 'Unblock' : 'Block'}
              </button>
              <button
                onClick={() => onDelete(user.id)}
                className="flex-1 text-xs font-medium rounded-md px-3 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            </div>

            <div>
              <h3 className="text-xs font-medium text-zinc-300 mb-2">Recent Audits</h3>
              {user.audits?.length > 0 ? (
                <div className="space-y-1.5">
                  {user.audits.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-white/[0.02] border border-zinc-800/50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs text-white truncate">{a.contractName || 'Untitled'}</div>
                        <div className="text-[10px] text-zinc-600">{new Date(a.createdAt).toLocaleDateString()}</div>
                      </div>
                      <RiskBadge level={a.overallRisk || a.status || 'INFO'} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">No audits.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
