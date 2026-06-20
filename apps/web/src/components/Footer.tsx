'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, MessageCircle, BookOpen } from 'lucide-react';
import { LogoMark } from '@/components/LogoMark';

// App-shell and auth routes render their own chrome — no marketing footer there.
const HIDDEN_PREFIXES = [
  '/dashboard', '/history', '/compare', '/settings', '/repo-audit',
  '/admin', '/login', '/register', '/verify-email',
];

const FOOTER_LINKS = {
  Product: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Verify Audit', href: '/verify' },
    { label: 'CLI Guide', href: '/cli' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Move Security', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contact', href: '#' },
  ],
};

const SOCIALS = [
  { icon: Code2, href: '#', label: 'GitHub' },
  { icon: MessageCircle, href: '#', label: 'Community' },
  { icon: BookOpen, href: '#', label: 'Docs' },
];

const reveal = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  show: (d: number = 0) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function Footer() {
  const pathname = usePathname();
  const isHidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (isHidden) return null;

  return (
    <footer className="relative overflow-hidden bg-obsidian">
      {/* top hairline + ambient glow */}
      <div className="absolute top-0 inset-x-0 h-px rule-champagne" />
      <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07), transparent 70%)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* ── Pre-footer CTA ──────────────────────────────────────── */}
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="relative my-16 rounded-[2rem] p-px overflow-hidden group shadow-premium-lg"
        >
          {/* Animated border gradient */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/30 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[2s] ease-in-out" />
          
          <div aria-hidden className="absolute inset-0 rounded-[2rem] opacity-70" style={{ background: 'linear-gradient(135deg, rgba(212,189,138,0.2), rgba(16,185,129,0.15) 45%, rgba(255,255,255,0.02) 80%)' }} />
          
          <div className="relative rounded-[calc(2rem-1px)] bg-[#08080a]/90 backdrop-blur-2xl px-8 py-14 md:px-16 md:py-16 text-center overflow-hidden border border-white/[0.04]">
            <div aria-hidden className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
            <div aria-hidden className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)' }} />

            <div className="relative inline-flex items-center gap-2.5 mb-6">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-champagne-400/80" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-champagne-400">Start Auditing</span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-champagne-400/80" />
            </div>
            
            <h2 className="relative font-display font-medium text-ivory text-[2.2rem] md:text-[3.2rem] leading-[1.05] tracking-[-0.02em] mb-5 drop-shadow-2xl">
              Ship Move code the world can <span className="lux-gradient">trust</span>
            </h2>
            
            <p className="relative text-[16px] text-zinc-400 max-w-lg mx-auto mb-10 leading-relaxed">
              Run a comprehensive AI security audit in under sixty seconds — sealed permanently on Walrus.
            </p>
            
            <motion.div whileHover={{ scale: 1.02 }} className="relative inline-block">
              <Link
                href="/#audit"
                className="group relative inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-b from-emerald-400 to-emerald-600 text-[#04140d] text-[15px] font-bold rounded-xl transition-all duration-300 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:-translate-y-0.5 active:translate-y-0"
              >
                <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="relative z-10">Start Free Audit</span>
                <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Columns ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12">
          {/* Brand */}
          <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0} className="col-span-2">
            <Link href="/" className="group flex items-center gap-2.5 mb-4">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-jade-500 to-champagne-500 flex items-center justify-center shadow-md shadow-black/40 transition-transform group-hover:scale-105">
                <LogoMark className="w-[18px] h-[18px] text-[#04140d]" strokeWidth={2.4} />
              </div>
              <span className="font-semibold text-ivory text-[15px] tracking-tight">
                SuiAudit<span className="lux-gradient"> AI</span>
              </span>
            </Link>
            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-xs mb-5">
              AI-powered security audits for Sui Move smart contracts.
              Every finding stored permanently on the Walrus decentralized network.
            </p>
            <div className="flex items-center gap-2.5">
              {SOCIALS.map((s) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="w-9 h-9 rounded-lg border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-zinc-500 hover:text-jade-300 hover:border-jade-400/30 transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links], idx) => (
            <motion.div key={category} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0.1 + idx * 0.08}>
              <h4 className="text-[11px] font-semibold text-champagne-400/90 uppercase tracking-[0.18em] mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-[13px] text-zinc-500 hover:text-ivory transition-colors"
                    >
                      <span className="h-px w-0 bg-jade-400/60 transition-all duration-300 group-hover:w-3" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ── Bottom bar ──────────────────────────────────────────── */}
        <div className="relative pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 pb-8">
          <p className="text-[11px] text-zinc-600">
            © {new Date().getFullYear()} SuiAudit AI · Securing the Move ecosystem
          </p>
          <div className="flex items-center gap-5">
            <Link href="#" className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="#" className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors">Terms</Link>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-jade-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-jade-400" />
              </span>
              All systems operational
            </span>
          </div>
        </div>
      </div>

      {/* giant faded wordmark */}
      <div aria-hidden className="pointer-events-none select-none relative -mt-4">
        <div className="font-display text-center leading-none font-medium text-white/[0.018] text-[22vw] tracking-tighter whitespace-nowrap">
          SuiAudit
        </div>
      </div>
    </footer>
  );
}
