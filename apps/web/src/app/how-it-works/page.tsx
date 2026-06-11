import React from 'react';
import Link from 'next/link';
import {
  FileCode2, Brain, BarChart3, Database, Shield, Zap, Lock,
  AlertTriangle, ChevronDown, CheckCircle2, ArrowRight, Globe,
  GitBranch, AlertCircle, Cpu, Clock, Share2,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works — SuiAudit AI',
  description:
    'Learn how SuiAudit AI analyzes your Sui Move smart contract using Claude Sonnet 4, generates a security report, and stores it permanently on the Walrus decentralized network.',
};

/* ─── Data ───────────────────────────────────────────────────────── */
const STEPS = [
  {
    number: '01',
    icon: FileCode2,
    title: 'Paste Your Move Contract',
    subtitle: 'Drop in any Sui Move module',
    color: 'from-blue-500 to-blue-600',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-500/20',
    bg: 'from-blue-500/10 to-blue-600/5',
    description:
      'Start by pasting your Sui Move source code into the Monaco editor. You can type or paste your contract directly, or load one of the built-in demo contracts to see the tool in action.',
    details: [
      'Supports any valid Sui Move module (up to 50KB)',
      'Built-in demo contracts: vulnerable DeFi vault + clean NFT collection',
      'Syntax highlighting and line numbers in the editor',
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
    color: 'from-purple-500 to-purple-600',
    glow: 'shadow-purple-500/20',
    border: 'border-purple-500/20',
    bg: 'from-purple-500/10 to-purple-600/5',
    description:
      'Your contract is sent to our NestJS backend, queued in BullMQ, and picked up by a worker that calls Claude Sonnet 4. The analysis runs through 14 vulnerability categories specifically designed for Sui Move.',
    details: [
      'Real-time progress via Server-Sent Events (SSE) — no polling needed',
      '14 vulnerability categories: access control, overflow, reentrancy, and more',
      'Move-specific checks: object confusion, capability misuse, shared object races',
      'Gas analysis and optimization suggestions included',
    ],
    code: null,
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'Structured Report',
    subtitle: 'Findings with severity & fixes',
    color: 'from-orange-500 to-orange-600',
    glow: 'shadow-orange-500/20',
    border: 'border-orange-500/20',
    bg: 'from-orange-500/10 to-orange-600/5',
    description:
      'Claude returns a typed JSON report with every finding categorized by severity. Each finding includes a title, description, impact assessment, recommendation, and often a code snippet showing the vulnerable pattern.',
    details: [
      'Severity levels: Critical, High, Medium, Low, Info',
      'Every finding includes: description, impact, and recommendation',
      'Vulnerable code snippets highlighted where applicable',
      'Executive summary + overall risk rating for quick triage',
    ],
    code: null,
  },
  {
    number: '04',
    icon: Database,
    title: 'Stored on Walrus',
    subtitle: 'Permanent, shareable link',
    color: 'from-cyan-500 to-cyan-600',
    glow: 'shadow-cyan-500/20',
    border: 'border-cyan-500/20',
    bg: 'from-cyan-500/10 to-cyan-600/5',
    description:
      'The full HTML report is rendered and uploaded to the Walrus decentralized storage network. You get a permanent blob ID and URL — share it with your team, community, or auditors with a single link that lives forever.',
    details: [
      'Reports stored on Walrus Testnet (permanent, censorship-resistant)',
      'Blob ID saved to PostgreSQL for fast retrieval',
      'Share the report URL — it never expires',
      'View the raw report directly on the Walrus aggregator',
    ],
    code: null,
  },
];

const VULN_CATEGORIES = [
  { name: 'Access Control', icon: Lock, color: 'text-red-400', desc: 'Missing capability checks, public entry without guards' },
  { name: 'Integer Overflow', icon: AlertTriangle, color: 'text-orange-400', desc: 'Arithmetic without safe bounds checking' },
  { name: 'Reentrancy', icon: GitBranch, color: 'text-yellow-400', desc: 'State changes after external calls' },
  { name: 'Shared Object Race', icon: Cpu, color: 'text-purple-400', desc: 'Concurrent access on shared objects' },
  { name: 'Capability Misuse', icon: Shield, color: 'text-blue-400', desc: 'Transferable or droppable capabilities' },
  { name: 'Object Confusion', icon: AlertCircle, color: 'text-cyan-400', desc: 'Incorrect object type handling' },
  { name: 'Gas Abuse', icon: Zap, color: 'text-green-400', desc: 'Unbounded loops and expensive patterns' },
  { name: 'Missing Validation', icon: CheckCircle2, color: 'text-pink-400', desc: 'Unchecked inputs and zero-value bypasses' },
];

const FAQS = [
  {
    q: 'Is my contract code stored anywhere?',
    a: 'Your source code is processed in-memory during analysis and is not stored permanently. Only the audit report (with findings) is stored on Walrus.',
  },
  {
    q: 'How accurate is the AI analysis?',
    a: "Claude Sonnet 4 is excellent at pattern-matching known vulnerability types in Move. For production contracts, we recommend using this as a first-pass tool alongside professional manual audits. The AI can miss context-specific issues but catches the majority of common patterns.",
  },
  {
    q: 'What is Walrus and why are reports stored there?',
    a: 'Walrus is a decentralized blob storage network on Sui. Storing reports there means they\'re censorship-resistant, permanent, and accessible to anyone with the blob ID — making it ideal for shareable audit certificates.',
  },
  {
    q: 'How long does an audit take?',
    a: 'Most contracts complete in 30–90 seconds depending on contract size and Claude API load. You watch live progress via Server-Sent Events so you know exactly what\'s happening.',
  },
  {
    q: 'Can I audit partial or incomplete contracts?',
    a: 'Yes, but quality improves with complete modules. The auditor needs to see the full function signatures and struct definitions to detect access control issues accurately.',
  },
  {
    q: 'What is the contract size limit?',
    a: 'The current limit is 50KB (approximately 50,000 characters). Most real-world Move modules fall well within this range.',
  },
];

/* ─── FAQ Item (client component logic embedded) ────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-[#21262d] rounded-xl bg-[#161b22] overflow-hidden">
      <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#1c2128] transition-colors">
        <span className="font-semibold text-gray-200 text-sm pr-4">{q}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="px-5 pb-5">
        <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
      </div>
    </details>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] pt-24 pb-20">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 text-center hero-grid">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-sm font-medium mb-6">
            <Cpu className="w-3.5 h-3.5" />
            Full technical walkthrough
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-5">
            How <span className="gradient-text">SuiAudit AI</span> Works
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            From pasting your contract to a permanent, shareable report on Walrus — here's exactly what happens under the hood.
          </p>
        </div>
      </section>

      {/* ── STEP-BY-STEP ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">
        {STEPS.map((step, idx) => (
          <div
            key={step.number}
            className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-start`}
          >
            {/* Content */}
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ${step.glow}`}>
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs font-black text-gray-600 uppercase tracking-widest">Step {step.number}</div>
                  <h2 className="text-xl font-black text-white">{step.title}</h2>
                  <p className="text-sm text-gray-500">{step.subtitle}</p>
                </div>
              </div>

              <p className="text-gray-400 leading-relaxed">{step.description}</p>

              <ul className="space-y-3">
                {step.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-3 text-sm text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual */}
            <div className="flex-1 w-full">
              {step.code ? (
                <div className="rounded-2xl border border-[#30363d] bg-[#161b22] overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#21262d] bg-[#0d1117]">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    <span className="ml-2 text-xs text-gray-600 font-mono">vault.move</span>
                  </div>
                  <pre className="p-5 text-xs text-gray-300 font-mono leading-relaxed overflow-x-auto">
                    <code>{step.code}</code>
                  </pre>
                </div>
              ) : (
                <div className={`rounded-2xl bg-gradient-to-br ${step.bg} border ${step.border} p-8 flex flex-col items-center justify-center text-center min-h-[200px] space-y-4`}>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ${step.glow}`}>
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{step.title}</div>
                    <div className="text-sm text-gray-400 mt-1">{step.subtitle}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── VULNERABILITY CATEGORIES ────────────────────────────────── */}
      <section className="border-y border-[#21262d] bg-[#0a0f14] py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#30363d] bg-[#161b22] text-gray-400 text-sm font-medium mb-4">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              What gets analyzed
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">14 Vulnerability Categories</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">
              Built specifically for the Sui Move execution model, covering the most common and dangerous patterns found in production contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VULN_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className="p-4 rounded-xl border border-[#21262d] bg-[#161b22] hover:border-[#30363d] hover:bg-[#1c2128] transition-all"
              >
                <cat.icon className={`w-5 h-5 ${cat.color} mb-3`} />
                <div className="font-semibold text-gray-200 text-sm mb-1">{cat.name}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────────────── */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white tracking-tight">Under the Hood</h2>
          <p className="text-gray-500 mt-3 text-sm">The technology powering SuiAudit AI</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Next.js 14', role: 'Frontend', icon: '⚡' },
            { name: 'NestJS', role: 'Backend API', icon: '🦅' },
            { name: 'Claude Sonnet 4', role: 'AI Analysis', icon: '🤖' },
            { name: 'BullMQ', role: 'Job Queue', icon: '🐂' },
            { name: 'PostgreSQL', role: 'Database', icon: '🐘' },
            { name: 'Walrus', role: 'Storage', icon: '🌊' },
          ].map((tech) => (
            <div key={tech.name} className="p-4 rounded-xl border border-[#21262d] bg-[#161b22] text-center hover:border-[#30363d] transition-colors">
              <div className="text-2xl mb-2">{tech.icon}</div>
              <div className="text-xs font-bold text-gray-300">{tech.name}</div>
              <div className="text-xs text-gray-600 mt-0.5">{tech.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-cyan-500/10 p-12 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-600/10 rounded-full blur-[80px]" />
          </div>
          <div className="relative">
            <Shield className="w-12 h-12 text-blue-400 mx-auto mb-5" />
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">
              Ready to audit your contract?
            </h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              It's free, takes under 60 seconds, and your report is stored permanently on Walrus.
            </p>
            <Link
              href="/#audit"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5" />
              Start Free Audit
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
