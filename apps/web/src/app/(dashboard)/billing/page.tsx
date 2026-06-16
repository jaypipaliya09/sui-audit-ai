'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { CreditCard, BarChart3, ExternalLink, Loader2, ArrowUpRight, Calendar, Zap, Shield } from 'lucide-react';

const PLAN_INFO: Record<string, { audits: number | string; price: string }> = {
  FREE:       { audits: 3, price: '0 USDC/mo' },
  PAY_AS_YOU_GO: { audits: 'Pay per file', price: '1 USDC/file' },
  DEVELOPER:  { audits: 25, price: '10 USDC/mo' },
  TEAM:       { audits: 100, price: '30 USDC/mo' },
  ENTERPRISE: { audits: 'Unlimited', price: 'Custom' },
};

export default function BillingPage() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBillingStatus()
      .then(setBilling)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    );
  }

  const currentPlan = billing?.plan || 'FREE';
  const used = billing?.auditsUsed || 0;
  const limit = billing?.auditsLimit || 3;
  const usagePct = Math.min((used / limit) * 100, 100);
  const planInfo = PLAN_INFO[currentPlan] || PLAN_INFO.FREE;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-lg font-semibold text-white">Billing</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Manage your subscription and usage.</p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg surface p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Current Plan</h3>
              <p className="text-xs text-zinc-500">{planInfo.price}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-md bg-indigo-500/8 border border-indigo-500/15 text-indigo-400 text-xs font-semibold self-start">
            {currentPlan}
          </span>
        </div>

        {/* Usage bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-zinc-500">Audits used this period</span>
            <span className="text-white font-medium">{used} / {limit}</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                usagePct > 80 ? 'bg-red-500' : usagePct > 60 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-zinc-700">
              {Math.max(limit - used, 0)} audits remaining
            </p>
            {billing?.resetDate && (
              <p className="text-[11px] text-zinc-700 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Resets {new Date(billing.resetDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-zinc-800/50">
          <Link href="/pricing" className="btn-primary text-xs py-2 px-3">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {currentPlan === 'FREE' ? 'Upgrade with USDC' : 'Change Plan'}
          </Link>
          <Link href="/my-audits" className="btn-secondary text-xs py-2 px-3">
            <ExternalLink className="w-3.5 h-3.5" />
            View Reports
          </Link>
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">Available Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(PLAN_INFO).filter(([key]) => key !== 'PAY_AS_YOU_GO').map(([name, info]) => (
            <div
              key={name}
              className={`p-4 rounded-lg border transition-all ${
                name === currentPlan
                  ? 'bg-indigo-500/[0.03] border-indigo-500/20'
                  : 'bg-[#111113] border-zinc-800/60 hover:border-zinc-700'
              }`}
            >
              <h4 className="text-xs font-semibold text-white mb-0.5">{name}</h4>
              <p className="text-lg font-bold text-white mb-1">{info.price}</p>
              <p className="text-[11px] text-zinc-600">
                {typeof info.audits === 'number' ? `${info.audits} audits/month` : info.audits}
              </p>
              {name === currentPlan && (
                <span className="inline-block mt-2.5 text-[11px] text-indigo-400 font-medium">Current plan</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
