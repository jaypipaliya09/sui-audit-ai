'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Check, Zap, Shield, Loader2 } from 'lucide-react';

const PLANS = [
  {
    name: 'FREE',
    price: '$0',
    period: '/mo',
    description: 'Get started with basic auditing',
    features: [
      '5 audits per month',
      'Single contract audits',
      'Basic risk scoring',
      'Walrus storage',
      'On-chain audit registry ✓',
    ],
    cta: 'Current Plan',
    priceId: null,
    popular: false,
  },
  {
    name: 'DEVELOPER',
    price: '$29',
    period: '/mo',
    description: 'For individual developers',
    features: [
      '50 audits per month',
      'Single + Repository audits',
      'Advanced risk analysis',
      'Gas optimization reports',
      'Priority queue',
      'Walrus storage',
      'On-chain audit registry ✓',
    ],
    cta: 'Upgrade',
    priceId: 'price_developer',
    popular: true,
  },
  {
    name: 'TEAM',
    price: '$99',
    period: '/mo',
    description: 'For development teams',
    features: [
      '200 audits per month',
      'Everything in Developer',
      'API key access',
      'Team management',
      'Custom webhooks',
      'Walrus storage',
      'On-chain audit registry ✓',
    ],
    cta: 'Upgrade',
    priceId: 'price_team',
    popular: false,
  },
  {
    name: 'ENTERPRISE',
    price: '$299',
    period: '/mo',
    description: 'For large organizations',
    features: [
      'Unlimited audits',
      'Everything in Team',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantees',
      'Advanced compliance',
      'Walrus storage',
      'On-chain audit registry ✓',
    ],
    cta: 'Contact Sales',
    priceId: 'price_enterprise',
    popular: false,
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
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Choose your plan
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Start free and upgrade as you grow. All plans include permanent Walrus storage and on-chain audit registration.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl border transition-all ${
                plan.popular
                  ? 'bg-indigo-500/5 border-indigo-500/30 shadow-xl shadow-indigo-500/5'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  Popular
                </div>
              )}

              <h3 className="font-bold text-white text-sm mb-1">{plan.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-3xl font-black text-white">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.priceId)}
                disabled={!plan.priceId || loadingPlan === plan.priceId}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  plan.popular
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : plan.priceId
                      ? 'bg-[#0f0f0f] border border-[#2a2a2a] hover:border-indigo-500/30 text-gray-300 hover:text-white'
                      : 'bg-[#0f0f0f] border border-[#2a2a2a] text-gray-600 cursor-default'
                }`}
              >
                {loadingPlan === plan.priceId ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 text-sm text-gray-600">
          <Shield className="w-4 h-4 inline mr-1" />
          All plans include permanent tamper-proof storage on the Walrus decentralized network.
        </div>
      </div>
    </div>
  );
}
