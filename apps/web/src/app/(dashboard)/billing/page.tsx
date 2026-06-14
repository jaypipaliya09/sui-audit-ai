'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CreditCard, BarChart3, ExternalLink, Loader2, ArrowUpRight } from 'lucide-react';

const PLANS = [
  { name: 'FREE', audits: 5, price: '$0/mo' },
  { name: 'DEVELOPER', audits: 50, price: '$29/mo' },
  { name: 'TEAM', audits: 200, price: '$99/mo' },
  { name: 'ENTERPRISE', audits: 'Unlimited', price: '$299/mo' },
];

export default function BillingPage() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    api.getBillingStatus()
      .then(setBilling)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await api.createPortalSession();
      window.location.href = res.url;
    } catch {
      // ignore
    }
    setPortalLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const currentPlan = billing?.plan || 'FREE';
  const usagePct = billing ? Math.min((billing.auditsUsed / billing.auditsLimit) * 100, 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription and usage.</p>
      </div>

      {/* Current Plan */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">Current Plan</h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold">
            {currentPlan}
          </span>
        </div>

        {/* Usage */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Audits used this month</span>
            <span className="text-white font-medium">{billing?.auditsUsed || 0} / {billing?.auditsLimit || 5}</span>
          </div>
          <div className="w-full h-2 bg-[#0f0f0f] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct > 80 ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {billing?.resetDate && (
            <p className="text-xs text-gray-600 mt-2">
              Resets {new Date(billing.resetDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <a
            href="/pricing"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            {currentPlan === 'FREE' ? 'Upgrade Plan' : 'Change Plan'}
          </a>
          <button
            onClick={handlePortal}
            disabled={portalLoading || currentPlan === 'FREE'}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0f0f0f] border border-[#2a2a2a] hover:border-[#3a3a3a] text-gray-300 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
          >
            {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Manage Billing
          </button>
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <h3 className="font-semibold text-white mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`p-5 rounded-2xl border transition-all ${
                plan.name === currentPlan
                  ? 'bg-indigo-500/5 border-indigo-500/30'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
            >
              <h4 className="font-bold text-white text-sm mb-1">{plan.name}</h4>
              <p className="text-xl font-bold text-white mb-3">{plan.price}</p>
              <p className="text-xs text-gray-500">{plan.audits} audits/month</p>
              {plan.name === currentPlan && (
                <span className="inline-block mt-3 text-xs text-indigo-400 font-medium">Current plan</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
