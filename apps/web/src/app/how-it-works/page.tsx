import React from 'react';
import Link from 'next/link';
import {
  FileCode2, Brain, BarChart3, Database, Shield, Zap, Lock,
  AlertTriangle, ChevronDown, CheckCircle2, ArrowRight, Globe,
  GitBranch, AlertCircle, Cpu, Clock, Share2,
} from 'lucide-react';
import { FadeIn } from '@/components/FadeIn';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works — SuiAudit AI',
  description: 'Learn how SuiAudit AI analyzes your Sui Move smart contract using Claude Sonnet 4.',
};

const STEPS = [
  {
    number: '01',
    icon: FileCode2,
    title: 'Paste Your Move Contract',
    subtitle: 'Drop in any Sui Move module',
    description: 'Start by pasting your Sui Move source code into the Monaco editor. You can type or paste your contract directly, or load one of the built-in demo contracts.',
    details: [
      'Supports any valid Sui Move module (up to 50KB)',
      'Built-in demo contracts available',
      'Syntax highlighting and line numbers',
      'Character count and size validation built in',
    ],
    code: `module vulnerable_defi::vault {
  use sui::coin::{Self, Coin};
  use sui::balance::{Self, Balance};
  use sui::sui::SUI;
  // ...

  // ⚠️  BUG: No access control on withdraw
  public entry fun withdraw(
    vault: &mut Vault,
    amount: u64,
    ctx: &mut TxContext,
  ) {
    // Anyone can drain the vault!
    let withdrawn = balance::split(
      &mut vault.total_balance, amount
    );
    // ...
  }
}`,
  },
  {
    number: '02',
    icon: Brain,
    title: 'AI Analysis Begins',
    subtitle: 'Claude Sonnet 4 scans deeply',
    description: 'Your contract is sent to our backend, queued in BullMQ, and analyzed by Claude Sonnet 4 across 14 vulnerability categories specific to Sui Move.',
    details: [
      'Real-time progress via Server-Sent Events',
      '14 vulnerability categories analyzed',
      'Move-specific checks: object confusion, capability misuse, shared object races',
      'Gas analysis and optimization included',
    ],
    code: null,
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'Structured Report',
    subtitle: 'Findings with severity & fixes',
    description: 'Claude returns a typed JSON report with every finding categorized by severity — title, description, impact assessment, recommendation, and code snippets.',
    details: [
      'Severity levels: Critical, High, Medium, Low, Info',
      'Each finding includes impact and recommendation',
      'Vulnerable code snippets highlighted',
      'Executive summary + overall risk rating',
    ],
    code: null,
  },
  {
    number: '04',
    icon: Database,
    title: 'Stored on Walrus',
    subtitle: 'Permanent, shareable link',
    description: 'The full report is uploaded to the Walrus decentralized storage network. You get a permanent blob ID and URL — share with anyone using a single link.',
    details: [
      'Permanent, censorship-resistant storage',
      'Blob ID saved for fast retrieval',
      'Report URL never expires',
      'View raw report on the Walrus aggregator',
    ],
    code: null,
  },
];

const VULN_CATEGORIES = [
  { name: 'Access Control', icon: Lock, desc: 'Missing capability checks, public entry without guards' },
  { name: 'Integer Overflow', icon: AlertTriangle, desc: 'Arithmetic without safe bounds' },
  { name: 'Reentrancy', icon: GitBranch, desc: 'State changes after external calls' },
  { name: 'Shared Object Race', icon: Cpu, desc: 'Concurrent access on shared objects' },
  { name: 'Capability Misuse', icon: Shield, desc: 'Transferable or droppable capabilities' },
  { name: 'Object Confusion', icon: AlertCircle, desc: 'Incorrect object type handling' },
  { name: 'Gas Abuse', icon: Zap, desc: 'Unbounded loops and expensive patterns' },
  { name: 'Missing Validation', icon: CheckCircle2, desc: 'Unchecked inputs and zero-value bypasses' },
];

const FAQS = [
  {
    q: 'Is my contract code stored anywhere?',
    a: 'Your source code is processed in-memory during analysis and is not stored permanently. Only the audit report is stored on Walrus.',
  },
  {
    q: 'How accurate is the AI analysis?',
    a: 'Claude Sonnet 4 is excellent at pattern-matching known vulnerability types in Move. For production contracts, we recommend using this alongside professional manual audits.',
  },
  {
    q: 'What is Walrus?',
    a: 'Walrus is a decentralized blob storage network on Sui. Reports stored there are censorship-resistant, permanent, and accessible to anyone with the blob ID.',
  },
  {
    q: 'How long does an audit take?',
    a: 'Most contracts complete in 30–90 seconds. You watch live progress via Server-Sent Events.',
  },
  {
    q: 'Can I audit partial or incomplete contracts?',
    a: 'Yes, but quality improves with complete modules. The auditor needs full function signatures and struct definitions for best results.',
  },
  {
    q: 'What is the size limit?',
    a: 'The current limit is 50KB (approximately 50,000 characters). Most real-world Move modules fall well within this range.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-lg surface overflow-hidden">
      <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-white/[0.015] transition-colors">
        <span className="text-sm font-medium text-zinc-300 pr-4">{q}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="px-4 pb-4">
        <p className="text-xs text-zinc-500 leading-relaxed">{a}</p>
      </div>
    </details>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#09090b] pt-20 pb-16">

      {/* Header */}
      <section className="relative overflow-hidden py-14 text-center hero-grid">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-indigo-600/[0.05] rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/8 text-indigo-400 text-xs font-medium mb-5">
            <Cpu className="w-3 h-3" />
            Technical walkthrough
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
            How <span className="text-indigo-400">SuiAudit AI</span> Works
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-lg mx-auto">
            From pasting your contract to a permanent report on Walrus — here's exactly what happens.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-16">
        {STEPS.map((step, idx) => (
          <FadeIn
            key={step.number}
            className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 items-start`}
          >
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                  <step.icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Step {step.number}</div>
                  <h2 className="text-base font-semibold text-white">{step.title}</h2>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{step.description}</p>
              <ul className="space-y-2">
                {step.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2 text-xs text-zinc-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1 w-full">
              {step.code ? (
                <div className="rounded-xl surface overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                    <span className="ml-2 text-[11px] text-zinc-600 font-mono">vault.move</span>
                  </div>
                  <pre className="p-4 text-[11px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">
                    <code>{step.code}</code>
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl bg-indigo-500/[0.03] border border-indigo-500/15 p-8 flex flex-col items-center justify-center text-center min-h-[180px] space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{step.title}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{step.subtitle}</div>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        ))}
      </section>

      {/* Vulnerability categories */}
      <section className="border-y border-zinc-900 bg-[#0c0c0e] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">14 Vulnerability Categories</h2>
            <p className="text-xs text-zinc-500 max-w-lg mx-auto">
              Built specifically for the Sui Move execution model.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {VULN_CATEGORIES.map((cat, i) => (
              <FadeIn
                delay={i * 0.06}
                key={cat.name}
                className="p-4 rounded-lg surface hover:border-zinc-700 transition-all"
              >
                <cat.icon className="w-4 h-4 text-indigo-400 mb-2" />
                <div className="text-xs font-semibold text-zinc-300 mb-0.5">{cat.name}</div>
                <div className="text-[11px] text-zinc-600 leading-relaxed">{cat.desc}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 max-w-2xl mx-auto px-4 sm:px-6">
        <FadeIn className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Frequently Asked Questions</h2>
        </FadeIn>
        <div className="space-y-2">
          {FAQS.map((faq, idx) => (
            <FadeIn key={faq.q} delay={idx * 0.06}>
              <FaqItem q={faq.q} a={faq.a} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        <FadeIn delay={0.15} className="rounded-xl bg-indigo-500/[0.04] border border-indigo-500/15 p-10 text-center">
          <Shield className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
            Ready to audit your contract?
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
            Free, under 60 seconds, permanently stored on Walrus.
          </p>
          <Link href="/#audit" className="btn-primary px-6 py-2.5 text-sm">
            <Zap className="w-4 h-4" />
            Start Free Audit
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </FadeIn>
      </section>
    </main>
  );
}
