import React from 'react';
import Link from 'next/link';
import {
  Terminal, Package, Play, FolderOpen, CreditCard,
  RefreshCw, CheckCircle2, Shield, ArrowRight, Zap,
  AlertTriangle, ChevronRight,
} from 'lucide-react';
import { FadeIn } from '@/components/FadeIn';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CLI Guide — SuiAudit AI',
  description: 'Audit Sui Move contracts from your terminal using the move-auditor CLI.',
};

const CLI_STEPS = [
  {
    icon: Package,
    title: 'Install',
    code: 'npm install -g @sui-audit/move-auditor',
    note: 'Requires Node.js ≥ 18',
  },
  {
    icon: Play,
    title: 'Run the wizard',
    code: 'move-auditor audit',
    note: 'Prompts guide you through key, wallet, track, files, and payment',
  },
  {
    icon: FolderOpen,
    title: 'Or scan a single file',
    code: 'move-auditor scan ./sources/vault.move -o report.md',
    note: 'No payment required — power-user / CI mode',
  },
];

const WIZARD_STEPS = [
  { step: '1', label: 'Connect wallet', desc: 'Enter your Slush wallet address. The CLI validates it on-chain and checks your SUI balance.' },
  { step: '2', label: 'Select track', desc: 'Pick the project category (DeFi, AI, Payments…). The AI focuses on the risks most relevant to that track.' },
  { step: '3', label: 'Choose scope', desc: 'Audit a single .move file or point at a codebase directory — the scanner finds all .move files recursively.' },
  { step: '4', label: 'Review cost', desc: 'The CLI prints a list of files and the total cost (1 SUI per file). Nothing moves until you confirm.' },
  { step: '5', label: 'Block funds', desc: 'An on-chain escrow locks the SUI. Funds are released automatically if the audit fails or is interrupted.' },
  { step: '6', label: 'Audit + deposit', desc: 'Claude audits each file in sequence. On success, the escrowed SUI is deposited and reports are saved locally.' },
];

const CLI_ENV_VARS = [
  {
    name: 'MOVE_AUDITOR_SECRET_KEY',
    required: true,
    operator: true,
    description: 'Operator signing key used to authorize escrow transactions on behalf of all users. Set once by the service deployer.',
    example: 'suiprivkey1...',
  },
  {
    name: 'ESCROW_PACKAGE_ID',
    required: true,
    operator: true,
    description: 'Object ID of the deployed move_auditor escrow package. Set once by the service deployer.',
    example: '0xabc123...',
  },
  {
    name: 'TREASURY_ADDRESS',
    required: true,
    operator: true,
    description: 'Sui address that receives captured audit fees. Set once by the service deployer.',
    example: '0xdef456...',
  },
  {
    name: 'BACKEND_URL',
    required: false,
    description: 'URL of the SuiAudit AI API server. When set, reports are uploaded for the web dashboard.',
    example: 'https://api.suiaudit.ai',
  },
  {
    name: 'FRONTEND_URL',
    required: false,
    description: 'Web app base URL printed after a run so you can click through to your report.',
    example: 'https://suiaudit.ai',
  },
  {
    name: 'MOVE_AUDITOR_MOCK_PAYMENT',
    required: false,
    description: 'Set to 1 to skip all on-chain transactions — no real funds move. Useful for CI and dry runs.',
    example: '1',
  },
  {
    name: 'SUI_NETWORK',
    required: false,
    description: 'Target Sui network. One of: testnet (default), mainnet, devnet.',
    example: 'testnet',
  },
  {
    name: 'PRICE_PER_FILE_SUI',
    required: false,
    description: 'Override the per-file audit cost in SUI. Defaults to 1 SUI per file.',
    example: '0.5',
  },
];

const CLI_TRACKS = [
  { value: 'ai', label: 'AI', desc: 'AI agents, AI-powered dApps', color: 'text-violet-400', bg: 'bg-violet-500/8 border-violet-500/20' },
  { value: 'defi', label: 'DeFi', desc: 'DEX, lending, staking, yield', color: 'text-blue-400', bg: 'bg-blue-500/8 border-blue-500/20' },
  { value: 'infra', label: 'Infrastructure', desc: 'SDKs, dev tools, analytics', color: 'text-cyan-400', bg: 'bg-cyan-500/8 border-cyan-500/20' },
  { value: 'crypto', label: 'Cryptography', desc: 'ZK, privacy, advanced crypto', color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/20' },
  { value: 'payments', label: 'Payments', desc: 'Wallets, merchant solutions', color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20' },
  { value: 'entertainment', label: 'Gaming / NFTs', desc: 'Games, media, creator economy', color: 'text-pink-400', bg: 'bg-pink-500/8 border-pink-500/20' },
  { value: 'storage', label: 'Storage', desc: 'Sui + Walrus apps', color: 'text-teal-400', bg: 'bg-teal-500/8 border-teal-500/20' },
  { value: 'degen', label: 'Degen', desc: 'Memecoins, viral consumer apps', color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/20' },
  { value: 'explorations', label: 'Explorations', desc: 'RWA, DePIN, multi-chain', color: 'text-indigo-400', bg: 'bg-indigo-500/8 border-indigo-500/20' },
];

export default function CliPage() {
  return (
    <main className="min-h-screen bg-[#09090b] pt-20 pb-16">

      {/* Header */}
      <section className="relative overflow-hidden py-14 text-center hero-grid">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-indigo-600/[0.05] rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/8 text-indigo-400 text-xs font-medium mb-5">
            <Terminal className="w-3 h-3" />
            Command-Line Interface
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
            CLI <span className="text-indigo-400">Documentation</span>
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-lg mx-auto">
            Audit Sui Move contracts directly from your terminal. Works standalone,
            integrates with CI pipelines, and supports full codebase scans.
          </p>
        </div>
      </section>

      {/* Quick-start */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <FadeIn className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-indigo-500" />
            <h2 className="text-lg font-bold text-white">Quick Start</h2>
          </div>
          <p className="text-xs text-zinc-500 ml-3">Up and running in four steps.</p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CLI_STEPS.map((step, idx) => (
            <FadeIn key={step.title} delay={idx * 0.08} className="rounded-xl surface overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                <div className="ml-2 flex items-center gap-1.5">
                  <step.icon className="w-3 h-3 text-zinc-600" />
                  <span className="text-[11px] text-zinc-600 font-mono">
                    step {idx + 1} — {step.title}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <pre className="text-[11px] text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap bg-zinc-950/60 rounded-lg p-3 mb-2.5">
                  <code>{step.code}</code>
                </pre>
                <p className="text-[11px] text-zinc-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-zinc-700 shrink-0" />
                  {step.note}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Commands */}
      <section className="border-y border-zinc-900 bg-[#0c0c0e] py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          <FadeIn>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full bg-indigo-500" />
              <h2 className="text-lg font-bold text-white">Commands</h2>
            </div>
          </FadeIn>

          {/* audit command */}
          <FadeIn>
            <div className="rounded-xl surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                  <span className="ml-2 text-[11px] text-zinc-500 font-mono">terminal</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                  Interactive Wizard
                </span>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <pre className="text-sm text-emerald-400 font-mono bg-zinc-950/60 rounded-lg px-4 py-3 mb-4 overflow-x-auto">
                    <code>move-auditor audit</code>
                  </pre>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    The default command. Launches an interactive step-by-step wizard — connect wallet,
                    pick track, select files, confirm cost, lock escrow, run audit, and deposit payment.
                    Reports are saved to{' '}
                    <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      ./move-auditor-reports/
                    </code>
                    .
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WIZARD_STEPS.map((item) => (
                    <div
                      key={item.step}
                      className="flex items-start gap-3 p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {item.step}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 mb-0.5">{item.label}</div>
                        <div className="text-[11px] text-zinc-600 leading-relaxed">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/15">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-amber-300 mb-0.5">Crash recovery</div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      If the process crashes mid-audit, the next launch detects the open escrow and
                      offers to release the blocked funds back to your wallet automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* scan command */}
          <FadeIn>
            <div className="rounded-xl surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                  <span className="ml-2 text-[11px] text-zinc-500 font-mono">terminal</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Direct Scan
                </span>
              </div>
              <div className="p-6 space-y-4">
                <pre className="text-sm text-emerald-400 font-mono bg-zinc-950/60 rounded-lg px-4 py-3 overflow-x-auto">
                  <code>{`move-auditor scan <path> [options]

# Audit a single file, report saved to ./audit-report.md
move-auditor scan ./sources/vault.move

# Custom output path
move-auditor scan ./sources/vault.move -o ./reports/vault-audit.md`}</code>
                </pre>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Directly audits a single{' '}
                  <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono">.move</code>{' '}
                  file with no wallet setup or payment flow. Ideal for quick local checks or CI pipelines.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
                    <code className="text-[11px] text-zinc-200 font-mono">&lt;path&gt;</code>
                    <span className="ml-2 text-[10px] text-red-400 font-semibold uppercase tracking-wide">required</span>
                    <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">
                      Path to the <code className="text-zinc-500 font-mono">.move</code> file to audit.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
                    <code className="text-[11px] text-zinc-200 font-mono">-o, --output &lt;path&gt;</code>
                    <span className="ml-2 text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">optional</span>
                    <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">
                      Output path for the Markdown report. Defaults to{' '}
                      <code className="text-zinc-500 font-mono">./audit-report.md</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Tracks */}
      <section className="py-14 max-w-4xl mx-auto px-4 sm:px-6">
        <FadeIn className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-indigo-500" />
            <h2 className="text-lg font-bold text-white">Project Tracks</h2>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed ml-3">
            Picked during <code className="text-zinc-400 bg-zinc-800 px-1 rounded font-mono text-[11px]">move-auditor audit</code>.
            Each track tells the AI which vulnerability categories to prioritize for that project type.
          </p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CLI_TRACKS.map((track, i) => (
            <FadeIn key={track.value} delay={i * 0.05} className={`rounded-lg border p-3.5 ${track.bg}`}>
              <div className={`text-xs font-semibold mb-0.5 ${track.color}`}>{track.label}</div>
              <div className="text-[11px] text-zinc-600">{track.desc}</div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Environment Variables */}
      <section className="border-t border-zinc-900 bg-[#0c0c0e] py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <FadeIn className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 rounded-full bg-indigo-500" />
              <h2 className="text-lg font-bold text-white">Environment Variables</h2>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed ml-3">
              Configure via environment variables or a{' '}
              <code className="text-zinc-400 bg-zinc-800 px-1 rounded font-mono text-[11px]">.env</code>{' '}
              file in your project root (loaded automatically on startup).
            </p>
          </FadeIn>

          <FadeIn>
            <div className="rounded-xl surface overflow-hidden mb-6">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                <span className="ml-2 text-[11px] text-zinc-600 font-mono">.env</span>
              </div>
              <div className="divide-y divide-zinc-800/40">
                {CLI_ENV_VARS.map((env) => (
                  <div key={env.name} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-start gap-2">
                    <div className="flex items-center gap-2 sm:w-64 shrink-0">
                      <code className="text-[11px] font-mono text-indigo-300 break-all">{env.name}</code>
                      {'operator' in env && env.operator ? (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          operator
                        </span>
                      ) : env.required ? (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                          required
                        </span>
                      ) : (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-600 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                          optional
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-500 leading-relaxed mb-1">{env.description}</p>
                      <code className="text-[10px] font-mono text-zinc-700">
                        example: <span className="text-zinc-500">{env.example}</span>
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Mock payment tip */}
          <FadeIn>
            <div className="flex items-start gap-3 p-5 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/15">
              <CreditCard className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-indigo-300 mb-1">Testing without real funds</div>
                <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                  Set{' '}
                  <code className="text-indigo-300/80 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono text-[11px]">
                    MOVE_AUDITOR_MOCK_PAYMENT=1
                  </code>{' '}
                  to skip all on-chain escrow transactions and run the full audit pipeline
                  with zero SUI spent. Ideal for CI environments, integration testing,
                  or exploring the tool before committing funds.
                </p>
                <pre className="text-[11px] text-emerald-400 font-mono bg-zinc-950/60 rounded-lg px-4 py-2.5 overflow-x-auto">
                  <code>MOVE_AUDITOR_MOCK_PAYMENT=1 move-auditor audit</code>
                </pre>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Report output */}
      <section className="py-14 max-w-4xl mx-auto px-4 sm:px-6">
        <FadeIn className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-indigo-500" />
            <h2 className="text-lg font-bold text-white">Report Output</h2>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed ml-3">
            After a successful audit, reports are written to disk and optionally uploaded to the web dashboard.
          </p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Local Markdown reports',
              desc: 'Each audited file gets its own .md report inside ./move-auditor-reports/. The report includes findings, severity, impact, recommendations, and vulnerable code snippets.',
              accent: 'indigo',
            },
            {
              title: 'Walrus permanent storage',
              desc: 'When BACKEND_URL is set, the backend uploads every report to the Walrus decentralized network. A permanent blob URL is appended to the local .md file and printed to the terminal.',
              accent: 'cyan',
            },
            {
              title: 'Web dashboard',
              desc: 'Uploaded reports appear in your SuiAudit AI web dashboard at /my-audits. Connect the same wallet address to see all past CLI audits alongside browser-submitted ones.',
              accent: 'emerald',
            },
            {
              title: 'Shareable URL',
              desc: 'Every report gets a public /report/:blobId URL that can be shared with your team, auditors, or the broader community — no login required to view.',
              accent: 'purple',
            },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.06} className="p-4 rounded-xl surface">
              <div className="text-sm font-semibold text-zinc-200 mb-1.5">{item.title}</div>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        <FadeIn delay={0.1} className="rounded-xl bg-indigo-500/[0.04] border border-indigo-500/15 p-10 text-center">
          <Terminal className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">
            Try the web auditor first?
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
            No setup required — paste your contract and get results in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/#audit" className="btn-primary px-6 py-2.5 text-sm">
              <Zap className="w-4 h-4" />
              Start Free Audit
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/how-it-works" className="btn-secondary px-6 py-2.5 text-sm">
              How It Works
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </FadeIn>
      </section>
    </main>
  );
}
