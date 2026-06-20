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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`glass-panel border ${card.border} p-5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group relative overflow-hidden`}>
          <div aria-hidden className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.bg.replace('/8', '/5')} rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center shrink-0`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{card.label}</span>
            </div>
            <div className="text-2xl font-display font-medium text-ivory tracking-tight">{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-panel p-6 shadow-premium-sm">
      <h3 className="text-[12px] font-bold uppercase tracking-widest text-emerald-400/80 mb-6 flex items-center gap-2">
        <Icon className="w-4 h-4" />
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-[#08080a] border-l border-white/[0.06] overflow-y-auto animate-slideInRight shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="sticky top-0 bg-[#08080a]/80 backdrop-blur-xl border-b border-white/[0.06] px-6 py-5 flex items-center justify-between z-10">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-ivory flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            User Detail
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500/50" /></div>
        ) : (
          <div className="p-6 space-y-8">
            <div className="flex items-center gap-4 bg-white/[0.01] border border-white/[0.04] rounded-2xl p-5 shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0">
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-display font-medium text-ivory truncate flex items-center gap-2 mb-1">
                  <span className={!user.name && user.suiAddress ? 'font-mono' : ''}>
                    {user.name || (user.suiAddress ? shortSui(user.suiAddress) : user.email)}
                  </span>
                  {user.isBlocked && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Blocked</span>}
                </div>
                <div className="text-xs text-zinc-500 font-mono truncate">{user.name ? user.email : (user.suiAddress ? 'Slush wallet' : user.email)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Meta label="Role" value={user.role} />
              <Meta label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'} />
              <Meta label="Total audits" value={String(user._count?.audits ?? '—')} />
              <Meta label="Verified" value={user.emailVerified ? 'Yes' : 'No'} />
              {user.suiAddress && <Meta label="Sui address" value={`${user.suiAddress.slice(0, 10)}…`} mono />}
            </div>

            <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Subscription Plan</label>
                <select
                  value={user.subscription?.plan || 'FREE'}
                  onChange={(e) => onPlanChange(user.id, e.target.value)}
                  className="w-full bg-obsidian border border-white/[0.06] text-ivory text-[13px] font-bold tracking-wider rounded-xl px-4 py-3 focus:border-emerald-500/40 focus:outline-none appearance-none cursor-pointer"
                >
                  {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => onToggleBlock(user.id, !user.isBlocked)}
                  className={`flex-1 text-[11px] font-bold uppercase tracking-wider rounded-xl px-4 py-3 border transition-colors ${
                    user.isBlocked
                      ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                      : 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  {user.isBlocked ? 'Unblock User' : 'Block User'}
                </button>
                <button
                  onClick={() => onDelete(user.id)}
                  className="flex-1 text-[11px] font-bold uppercase tracking-wider rounded-xl px-4 py-3 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete User
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Recent Audits</h3>
              {user.audits?.length > 0 ? (
                <div className="space-y-2">
                  {user.audits.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 hover:bg-white/[0.04] transition-colors">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-ivory truncate mb-0.5">{a.contractName || 'Untitled'}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{new Date(a.createdAt).toLocaleDateString()}</div>
                      </div>
                      <RiskBadge level={a.overallRisk || a.status || 'INFO'} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 bg-white/[0.01] border border-white/[0.04] rounded-xl">
                  <p className="text-xs text-zinc-500 italic">No audits generated yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
