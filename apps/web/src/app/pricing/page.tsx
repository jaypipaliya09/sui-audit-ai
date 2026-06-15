'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Check, Zap, Loader2, Shield, ArrowRight, Minus } from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    id: 'FREE',
    price: '$0',
    period: '/month',
    description: 'For getting started',
    features: [
      { text: '3 audits per month', included: true },
      { text: 'Basic findings', included: true },
      { text: '30-day Walrus storage', included: true },
      { text: 'On-chain audit registry', included: true },
      { text: 'Watermarked reports', included: true },
      { text: 'PDF export', included: false },
      { text: 'Compare/diff audits', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Current Plan',
    priceId: null,
    popular: false,
    accent: 'zinc',
  },
  {
    name: 'Developer',
    id: 'DEVELOPER',
    price: '$49',
    period: '/month',
    description: 'For individual developers',
    features: [
      { text: '25 audits per month', included: true },
      { text: 'Full findings + analysis', included: true },
      { text: 'Permanent Walrus storage', included: true },
      { text: 'On-chain audit registry', included: true },
      { text: 'PDF export', included: true },
      { text: 'Compare/diff audits', included: true },
      { text: 'Priority queue', included: true },
      { text: 'API access', included: false },
    ],
    cta: 'Get Started',
    priceId: 'price_developer_monthly',
    popular: true,
    accent: 'indigo',
  },
  {
    name: 'Team',
    id: 'TEAM',
    price: '$199',
    period: '/month',
    description: 'For development teams',
    features: [
      { text: '100 audits per month', included: true },
      { text: 'Everything in Developer', included: true },
      { text: '5 team members', included: true },
      { text: 'API key access', included: true },
      { text: 'Slack integration', included: true },
      { text: 'Priority queue', included: true },
      { text: 'Team management', included: true },
      { text: 'Custom webhooks', included: true },
    ],
    cta: 'Get Started',
    priceId: 'price_team_monthly',
    popular: false,
    accent: 'purple',
  },
  {
    name: 'Enterprise',
    id: 'ENTERPRISE',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      { text: 'Unlimited audits', included: true },
      { text: 'Everything in Team', included: true },
      { text: 'Dedicated context', included: true },
      { text: 'SLA guarantees', included: true },
      { text: 'White-label reports', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Dedicated support', included: true },
    ],
    cta: 'Contact Sales',
    priceId: 'price_enterprise',
    popular: false,
    accent: 'emerald',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (priceId: string | null) => {
    if (!priceId) return;
    if (!isAuthenticated) {
      router.push('/register');
      return;
    }

    setLoadingPlan(priceId);
    try {
      const res = await api.createCheckout(priceId);
      window.location.href = res.url;
    } catch {
      // ignore
    }
    setLoadingPlan(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14 animate-fadeInUp">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-sm text-zinc-500 max-w-lg mx-auto leading-relaxed">
            Start free. Upgrade as you grow. All plans include permanent Walrus storage
            and on-chain audit registration.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative p-5 rounded-xl border transition-all animate-fadeInUp ${
                plan.popular
                  ? 'bg-indigo-500/[0.03] border-indigo-500/20'
                  : 'bg-[#111113] border-zinc-800/60 hover:border-zinc-700'
              }`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-semibold tracking-wide uppercase">
                  Popular
                </div>
              )}

              <h3 className="text-sm font-semibold text-white mb-0.5">{plan.name}</h3>
              <p className="text-[11px] text-zinc-600 mb-4">{plan.description}</p>

              <div className="mb-5">
                <span className="text-2xl font-bold text-white">{plan.price}</span>
                <span className="text-xs text-zinc-600">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2 text-xs">
                    {feature.included ? (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-zinc-700 shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? 'text-zinc-400' : 'text-zinc-700'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.priceId)}
                disabled={!plan.priceId || loadingPlan === plan.priceId}
                className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                  plan.popular
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : plan.priceId
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-600'
                      : 'bg-zinc-900 text-zinc-700 cursor-default border border-zinc-800'
                }`}
              >
                {loadingPlan === plan.priceId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Pay as you go */}
        <div className="mt-8 p-5 rounded-xl bg-[#111113] border border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Pay As You Go</h3>
              <p className="text-xs text-zinc-500">$5 per audit. No subscription required.</p>
            </div>
          </div>
          <button
            onClick={() => handleCheckout('price_payg_per_audit')}
            className="btn-secondary text-xs py-2"
          >
            Get Started <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Trust note */}
        <div className="text-center mt-10">
          <div className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
            <Shield className="w-3.5 h-3.5" />
            All plans include permanent Walrus storage and on-chain audit registry.
          </div>
        </div>
      </div>
    </div>
  );
}
