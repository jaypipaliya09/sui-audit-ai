import React from 'react';
import {
  Terminal, Package, Play, FolderOpen, CreditCard,
  RefreshCw, CheckCircle2, FileText, Globe, LayoutDashboard, Share2,
} from 'lucide-react';
import { Reveal, SpotlightCard } from '@/components/home/HomeUI';
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
  { value: 'ai', label: 'AI', desc: 'AI agents, AI-powered dApps', color: 'text-violet-300', dot: '#a78bfa', spotlight: 'rgba(167,139,250,0.14)' },
  { value: 'defi', label: 'DeFi', desc: 'DEX, lending, staking, yield', color: 'text-blue-300', dot: '#60a5fa', spotlight: 'rgba(96,165,250,0.14)' },
  { value: 'infra', label: 'Infrastructure', desc: 'SDKs, dev tools, analytics', color: 'text-cyan-300', dot: '#22d3ee', spotlight: 'rgba(34,211,238,0.14)' },
  { value: 'crypto', label: 'Cryptography', desc: 'ZK, privacy, advanced crypto', color: 'text-emerald-300', dot: '#34d399', spotlight: 'rgba(52,211,153,0.14)' },
  { value: 'payments', label: 'Payments', desc: 'Wallets, merchant solutions', color: 'text-amber-300', dot: '#fbbf24', spotlight: 'rgba(251,191,36,0.14)' },
  { value: 'entertainment', label: 'Gaming / NFTs', desc: 'Games, media, creator economy', color: 'text-pink-300', dot: '#f472b6', spotlight: 'rgba(244,114,182,0.14)' },
  { value: 'storage', label: 'Storage', desc: 'Sui + Walrus apps', color: 'text-teal-300', dot: '#2dd4bf', spotlight: 'rgba(45,212,191,0.14)' },
  { value: 'degen', label: 'Degen', desc: 'Memecoins, viral consumer apps', color: 'text-orange-300', dot: '#fb923c', spotlight: 'rgba(251,146,60,0.14)' },
  { value: 'explorations', label: 'Explorations', desc: 'RWA, DePIN, multi-chain', color: 'text-sky-300', dot: '#38bdf8', spotlight: 'rgba(56,189,248,0.14)' },
];

const REPORT_OUTPUTS = [
  { icon: FileText, title: 'Local Markdown reports', accent: '#34d399', spotlight: 'rgba(52,211,153,0.13)', desc: 'Each audited file gets its own .md report inside ./move-auditor-reports/. The report includes findings, severity, impact, recommendations, and vulnerable code snippets.' },
  { icon: Globe, title: 'Walrus permanent storage', accent: '#22d3ee', spotlight: 'rgba(34,211,238,0.13)', desc: 'When BACKEND_URL is set, the backend uploads every report to the Walrus decentralized network. A permanent blob URL is appended to the local .md file and printed to the terminal.' },
  { icon: LayoutDashboard, title: 'Web dashboard', accent: '#d4bd8a', spotlight: 'rgba(212,189,138,0.13)', desc: 'Uploaded reports appear in your SuiAudit AI web dashboard at /my-audits. Connect the same wallet address to see all past CLI audits alongside browser-submitted ones.' },
  { icon: Share2, title: 'Shareable URL', accent: '#a78bfa', spotlight: 'rgba(167,139,250,0.13)', desc: 'Every report gets a public /report/:blobId URL that can be shared with your team, auditors, or the broader community — no login required to view.' },
];

/* ─── Reusable premium section header (eyebrow + display title) ───── */
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Reveal className="mb-10">
      <div className="inline-flex items-center gap-2.5 mb-3">
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-champagne-400/70" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-champagne-400">{eyebrow}</span>
      </div>
      <h2 className="font-display font-medium text-ivory text-[1.8rem] md:text-[2.3rem] tracking-[-0.02em] leading-[1.1]">
        {title}
      </h2>
      {sub && <p className="mt-3.5 text-[14px] text-zinc-400 leading-relaxed max-w-2xl">{sub}</p>}
    </Reveal>
  );
}

/* ─── Window chrome row (traffic lights + label) ─────────────────── */
function Chrome({ label, badge, badgeColor }: { label: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e0676a]/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#d4bd8a]/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]/60" />
        <span className="ml-2 text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
          <Terminal className="w-3 h-3" /> {label}
        </span>
      </div>
      {badge && (
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${badgeColor || 'text-jade-400'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

/* ─── Gradient-bordered premium terminal window ──────────────────── */
function TerminalWindow({
  label, badge, badgeColor, children, className = '',
}: {
  label: string; badge?: string; badgeColor?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`relative rounded-2xl p-px overflow-hidden ${className}`}>
      <div aria-hidden className="absolute inset-0 rounded-2xl opacity-70" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.38), rgba(212,189,138,0.12) 45%, rgba(255,255,255,0.04) 78%)' }} />
      <div className="relative rounded-2xl bg-[#0b0b0f]/92 backdrop-blur-xl overflow-hidden shadow-2xl shadow-emerald-950/30 hiw-shimmer">
        <Chrome label={label} badge={badge} badgeColor={badgeColor} />
        {children}
      </div>
    </div>
  );
}

export default function CliPage() {
  return (
    <main className="relative min-h-screen bg-obsidian pt-20 pb-16 overflow-hidden">
      {/* page vignette */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]" style={{ boxShadow: 'inset 0 0 220px 50px rgba(0,0,0,0.5)' }} />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16">
        {/* ambient layers */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(212,189,138,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,189,138,0.04) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 35%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 35%, transparent 100%)',
          }}
        />
        <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.16), rgba(16,185,129,0.04) 50%, transparent 72%)' }} />
        <div aria-hidden className="absolute top-24 right-[8%] w-[320px] h-[320px] rounded-full blur-[150px] opacity-50 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,189,138,0.08), transparent 70%)' }} />
        <div aria-hidden className="absolute top-0 inset-x-0 h-px rule-champagne pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* copy */}
          <Reveal>
            <div className="inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] text-[12px] text-zinc-400 mb-6">
              <span className="inline-flex items-center gap-1.5 text-jade-300 font-medium">
                <Terminal className="w-3.5 h-3.5" /> move-auditor
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="text-zinc-500">v1 · Sui Testnet</span>
            </div>
            <h1 className="font-display font-medium text-ivory text-[2.6rem] md:text-[3.4rem] leading-[1.04] tracking-[-0.02em] mb-5">
              Audit from your{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(110deg, #6ee7b7 0%, #34d399 35%, #d4bd8a 100%)' }}
              >
                terminal
              </span>
            </h1>
            <p className="text-[15px] text-zinc-400 leading-relaxed max-w-md mb-7">
              Run comprehensive AI security audits on Sui Move contracts without leaving your shell.
              Works standalone, drops into CI pipelines, and scans entire codebases.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-zinc-500">
              {['Standalone & CI-ready', 'On-chain escrow payments', 'Walrus-permanent reports'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-jade-400/80" /> {t}
                </span>
              ))}
            </div>
          </Reveal>

          {/* animated hero terminal */}
          <Reveal delay={0.15}>
            <TerminalWindow label="zsh — move-auditor" badge="● live" badgeColor="text-jade-400">
              {/* scan line */}
              <div aria-hidden className="hiw-scan-line bg-gradient-to-r from-transparent via-jade-400/25 to-transparent pointer-events-none" />
              <div className="relative p-5 font-mono text-[12.5px] leading-[1.9]">
                <div className="text-zinc-300">
                  <span className="text-jade-400">➜</span> <span className="text-champagne-400">~</span> move-auditor audit
                </div>
                {[
                  { c: '#34d399', t: '✔', d: 'Wallet connected · 12.4 SUI' },
                  { c: '#34d399', t: '✔', d: 'Track selected · DeFi' },
                  { c: '#34d399', t: '✔', d: '3 files queued · 3 SUI escrow locked' },
                  { c: '#d4bd8a', t: '◆', d: 'Auditing vault.move …' },
                ].map((l, i) => (
                  <Reveal key={l.d} delay={0.4 + i * 0.18}>
                    <div className="text-zinc-400">
                      <span style={{ color: l.c }}>{l.t}</span> {l.d}
                    </div>
                  </Reveal>
                ))}
                <Reveal delay={1.2}>
                  <div className="mt-1 flex items-center gap-2 text-jade-300">
                    <span className="text-zinc-600">└─</span> 2 critical · 5 high · report saved
                    <span className="inline-block w-2 h-[15px] ml-0.5 bg-jade-400/80 align-middle hiw-blink" />
                  </div>
                </Reveal>
              </div>
            </TerminalWindow>
          </Reveal>
        </div>
      </section>

      {/* ── QUICK START ───────────────────────────────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div aria-hidden className="absolute top-8 left-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-jade-600/[0.05] rounded-full blur-[120px] pointer-events-none" />
        <SectionHead
          eyebrow="Get Running"
          title={<>Up and running in <span className="lux-gradient">three steps</span></>}
          sub="Install globally, then launch the guided wizard — or scan a single file with zero setup."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CLI_STEPS.map((step, idx) => (
            <Reveal key={step.title} delay={idx * 0.1}>
              <SpotlightCard className="h-full">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
                  <span className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-jade-500/20 to-champagne-400/10 border border-jade-400/20 flex items-center justify-center shrink-0">
                    <step.icon className="w-3.5 h-3.5 text-jade-300" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">step {idx + 1}</div>
                    <div className="text-[13px] font-semibold text-white truncate group-hover:text-jade-300 transition-colors">{step.title}</div>
                  </div>
                </div>
                <div className="p-4">
                  <pre className="text-[11px] text-jade-300 font-mono leading-relaxed whitespace-pre-wrap bg-black/40 border border-white/[0.04] rounded-lg p-3 mb-3">
                    <code><span className="text-zinc-600 select-none">$ </span>{step.code}</code>
                  </pre>
                  <p className="text-[11px] text-zinc-500 flex items-start gap-1.5 leading-relaxed">
                    <CheckCircle2 className="w-3 h-3 text-jade-500/60 shrink-0 mt-0.5" />
                    {step.note}
                  </p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── COMMANDS ──────────────────────────────────────────────────── */}
      <section className="relative border-y border-white/[0.05] bg-[#0a0a0d] py-20 overflow-hidden">
        <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-jade-500/25 to-transparent" />
        <div aria-hidden className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-jade-500/25 to-transparent" />
        <div aria-hidden className="absolute inset-0 hiw-dot-grid opacity-20 pointer-events-none" />
        <div aria-hidden className="absolute -top-16 right-[12%] w-[360px] h-[280px] bg-champagne-500/[0.05] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          <SectionHead
            eyebrow="Reference"
            title={<>Two ways to <span className="lux-gradient">run an audit</span></>}
            sub="A guided, paid wizard for full runs — or a direct, free single-file scan for CI."
          />

          {/* audit command */}
          <Reveal>
            <TerminalWindow label="terminal" badge="Interactive Wizard" badgeColor="text-jade-400">
              <div className="p-6 space-y-5">
                <pre className="text-sm text-jade-300 font-mono bg-black/40 border border-white/[0.04] rounded-lg px-4 py-3 overflow-x-auto">
                  <code><span className="text-zinc-600 select-none">$ </span>move-auditor audit</code>
                </pre>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  The default command. Launches an interactive step-by-step wizard — connect wallet,
                  pick track, select files, confirm cost, lock escrow, run audit, and deposit payment.
                  Reports are saved to{' '}
                  <code className="text-jade-300/90 bg-jade-500/10 border border-jade-500/15 px-1.5 py-0.5 rounded text-[11px] font-mono">
                    ./move-auditor-reports/
                  </code>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WIZARD_STEPS.map((item, i) => (
                    <Reveal key={item.step} delay={i * 0.06}>
                      <div className="group/step h-full flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] transition-all duration-300 hover:border-jade-400/25 hover:bg-jade-500/[0.04]">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-jade-500 to-champagne-500 text-[#04140d] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-md shadow-emerald-950/40">
                          {item.step}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-zinc-200 mb-0.5 group-hover/step:text-jade-200 transition-colors">{item.label}</div>
                          <div className="text-[11px] text-zinc-500 leading-relaxed">{item.desc}</div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>

                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/15">
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
            </TerminalWindow>
          </Reveal>

          {/* scan command */}
          <Reveal delay={0.05}>
            <TerminalWindow label="terminal" badge="Direct Scan" badgeColor="text-champagne-400">
              <div className="p-6 space-y-4">
                <pre className="text-sm text-jade-300 font-mono bg-black/40 border border-white/[0.04] rounded-lg px-4 py-3 overflow-x-auto leading-relaxed">
                  <code>{`move-auditor scan <path> [options]

# Audit a single file, report saved to ./audit-report.md
move-auditor scan ./sources/vault.move

# Custom output path
move-auditor scan ./sources/vault.move -o ./reports/vault-audit.md`}</code>
                </pre>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  Directly audits a single{' '}
                  <code className="text-jade-300/90 bg-jade-500/10 border border-jade-500/15 px-1.5 py-0.5 rounded text-[11px] font-mono">.move</code>{' '}
                  file with no wallet setup or payment flow. Ideal for quick local checks or CI pipelines.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <code className="text-[11px] text-zinc-200 font-mono">&lt;path&gt;</code>
                    <span className="ml-2 text-[10px] text-red-400 font-semibold uppercase tracking-wide">required</span>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Path to the <code className="text-zinc-400 font-mono">.move</code> file to audit.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <code className="text-[11px] text-zinc-200 font-mono">-o, --output &lt;path&gt;</code>
                    <span className="ml-2 text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">optional</span>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Output path for the Markdown report. Defaults to{' '}
                      <code className="text-zinc-400 font-mono">./audit-report.md</code>.
                    </p>
                  </div>
                </div>
              </div>
            </TerminalWindow>
          </Reveal>
        </div>
      </section>

      {/* ── TRACKS ────────────────────────────────────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div aria-hidden className="absolute top-12 right-1/4 w-[420px] h-[260px] bg-jade-600/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <SectionHead
          eyebrow="Specialization"
          title={<>Nine project <span className="lux-gradient">tracks</span></>}
          sub={<>Picked during <code className="text-zinc-300 bg-white/[0.05] border border-white/[0.06] px-1.5 rounded font-mono text-[11px]">move-auditor audit</code>. Each track tells the AI which vulnerability categories to prioritize.</>}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CLI_TRACKS.map((track, i) => (
            <Reveal key={track.value} delay={(i % 3) * 0.08}>
              <SpotlightCard className="h-full p-4" spotlight={track.spotlight}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: track.dot, boxShadow: `0 0 8px ${track.dot}` }} />
                  <div className={`text-[13px] font-semibold ${track.color}`}>{track.label}</div>
                </div>
                <div className="text-[11px] text-zinc-500 leading-relaxed pl-3.5">{track.desc}</div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── ENVIRONMENT VARIABLES ─────────────────────────────────────── */}
      <section className="relative border-y border-white/[0.05] bg-[#0a0a0d] py-20 overflow-hidden">
        <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-jade-500/25 to-transparent" />
        <div aria-hidden className="absolute -bottom-16 left-[12%] w-[360px] h-[260px] bg-jade-600/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <SectionHead
            eyebrow="Configuration"
            title={<>Environment <span className="lux-gradient">variables</span></>}
            sub={<>Configure via environment variables or a <code className="text-zinc-300 bg-white/[0.05] border border-white/[0.06] px-1.5 rounded font-mono text-[11px]">.env</code> file in your project root (loaded automatically on startup).</>}
          />

          <Reveal>
            <TerminalWindow label=".env" className="mb-6">
              <div className="divide-y divide-white/[0.05]">
                {CLI_ENV_VARS.map((env, i) => (
                  <div
                    key={env.name}
                    style={{ animationDelay: `${i * 0.04}s` }}
                    className="group/env px-5 py-3.5 flex flex-col sm:flex-row sm:items-start gap-2 transition-colors duration-300 hover:bg-jade-500/[0.03] animate-fadeIn"
                  >
                    <div className="flex items-center gap-2 sm:w-64 shrink-0">
                      <code className="text-[11px] font-mono text-jade-300 break-all group-hover/env:text-jade-200 transition-colors">{env.name}</code>
                      {'operator' in env && env.operator ? (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">operator</span>
                      ) : env.required ? (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">required</span>
                      ) : (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded">optional</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-500 leading-relaxed mb-1">{env.description}</p>
                      <code className="text-[10px] font-mono text-zinc-600">
                        example: <span className="text-zinc-400">{env.example}</span>
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </TerminalWindow>
          </Reveal>

          {/* Mock payment tip */}
          <Reveal delay={0.05}>
            <div className="relative rounded-2xl p-px overflow-hidden">
              <div aria-hidden className="absolute inset-0 rounded-2xl opacity-60" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.3), rgba(212,189,138,0.1) 50%, transparent 80%)' }} />
              <div className="relative flex items-start gap-3 p-5 rounded-2xl bg-[#0b0b0f]/90 backdrop-blur-xl">
                <span className="w-9 h-9 rounded-xl bg-jade-500/10 border border-jade-400/20 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-jade-400" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-jade-300 mb-1">Testing without real funds</div>
                  <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                    Set{' '}
                    <code className="text-jade-300/90 bg-jade-500/10 border border-jade-500/15 px-1.5 py-0.5 rounded font-mono text-[11px]">
                      MOVE_AUDITOR_MOCK_PAYMENT=1
                    </code>{' '}
                    to skip all on-chain escrow transactions and run the full audit pipeline
                    with zero SUI spent. Ideal for CI environments, integration testing,
                    or exploring the tool before committing funds.
                  </p>
                  <pre className="text-[11px] text-jade-300 font-mono bg-black/40 border border-white/[0.04] rounded-lg px-4 py-2.5 overflow-x-auto">
                    <code><span className="text-zinc-600 select-none">$ </span>MOVE_AUDITOR_MOCK_PAYMENT=1 move-auditor audit</code>
                  </pre>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── REPORT OUTPUT ─────────────────────────────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div aria-hidden className="absolute top-10 left-1/2 -translate-x-1/2 w-[520px] h-[240px] bg-jade-600/[0.05] rounded-full blur-[120px] pointer-events-none" />
        <SectionHead
          eyebrow="Output"
          title={<>Where your <span className="lux-gradient">reports</span> land</>}
          sub="After a successful audit, reports are written to disk and optionally uploaded to the web dashboard."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORT_OUTPUTS.map((item, i) => (
            <Reveal key={item.title} delay={(i % 2) * 0.1}>
              <SpotlightCard className="h-full p-5" spotlight={item.spotlight}>
                <div className="flex items-center gap-3 mb-2.5">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${item.accent}1a`, borderColor: `${item.accent}33` }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: item.accent }} />
                  </span>
                  <div className="text-[14px] font-semibold text-white group-hover:text-jade-100 transition-colors">{item.title}</div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
