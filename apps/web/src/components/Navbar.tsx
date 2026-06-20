'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Menu, X, Zap, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react';
import { WalletButton } from '@/components/WalletButton';
import { LogoMark } from '@/components/LogoMark';
import { useAuth } from '@/lib/auth';

const PUBLIC_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/cli', label: 'CLI Guide' },
  { href: '/my-audits', label: 'My Audits' },
  { href: '/verify', label: 'Verify' },
];

export function Navbar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isHiddenPage = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/compare') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/register');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setShowUserMenu(false);
  }, [pathname]);

  if (isHiddenPage) return null;

  return (
    <motion.header
      initial={reduce ? false : { y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex justify-center ${
        isScrolled ? 'pt-4 px-4' : 'pt-0 px-0'
      }`}
    >
      <div
        className={`w-full max-w-6xl transition-all duration-500 ${
          isScrolled
            ? 'glass-panel px-6 rounded-2xl mx-auto shadow-premium-md border border-white/[0.06] bg-[#08080a]/80 backdrop-blur-2xl'
            : 'px-4 sm:px-6 bg-transparent border-transparent'
        }`}
      >
      <nav className={`h-16 flex items-center justify-between transition-all duration-500`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          {/* ── Mark ── */}
          <div className="relative">
            {/* breathing glow */}
            <motion.span
              aria-hidden
              className="absolute -inset-1.5 rounded-2xl bg-jade-500/30 blur-md"
              animate={reduce ? undefined : { opacity: [0.35, 0.7, 0.35], scale: [0.92, 1.06, 0.92] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* rotating conic rim */}
            <motion.span
              aria-hidden
              className="absolute -inset-px rounded-[13px] opacity-80 group-hover:opacity-100 transition-opacity"
              style={{ background: 'conic-gradient(from 0deg, rgba(110,231,183,0), rgba(212,189,138,0.95), rgba(52,211,153,0.95), rgba(110,231,183,0))' }}
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              whileHover={reduce ? undefined : { scale: 1.1, rotate: -6 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-jade-400 via-jade-500 to-champagne-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 overflow-hidden"
            >
              {/* inner bevel highlight */}
              <span aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
              {/* recurring light sweep */}
              <motion.span
                aria-hidden
                className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                animate={reduce ? undefined : { x: ['0%', '360%'] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }}
              />
              <LogoMark className="relative w-[22px] h-[22px] text-[#04140d] drop-shadow-sm" strokeWidth={2.4} />
            </motion.div>
          </div>

          {/* ── Wordmark ── */}
          <span className="relative font-semibold text-[15px] tracking-tight overflow-hidden">
            <span className="text-ivory">SuiAudit</span>
            <motion.span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(110deg, #6ee7b7 0%, #34d399 32%, #ffffff 50%, #34d399 68%, #d4bd8a 100%)', backgroundSize: '220% 100%' }}
              animate={reduce ? undefined : { backgroundPosition: ['140% 50%', '-40% 50%'] }}
              transition={{ duration: 5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
            >
              {' '}AI
            </motion.span>
            {/* hover sheen */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-[900ms] ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />
          </span>
        </Link>

        {/* Desktop Nav with sliding active indicator */}
        <div className="hidden md:flex items-center gap-0.5">
          {PUBLIC_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-ivory' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/[0.08]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <WalletButton />
          </div>

          {isAuthenticated && user?.role !== 'ADMIN' && user?.role !== 'OWNER' && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-jade-500/20 border border-jade-400/30 flex items-center justify-center text-jade-300 text-xs font-semibold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-52 bg-obsidian/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                  >
                    <div className="absolute top-0 inset-x-0 h-px rule-champagne" />
                    <div className="px-3.5 py-3 border-b border-white/[0.06]">
                      <p className="text-xs font-medium text-ivory truncate">{user?.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3.5 py-2.5 text-xs text-zinc-400 hover:text-ivory hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-jade-400" /> Dashboard
                    </Link>
                    <button
                      onClick={async () => { await logout(); setShowUserMenu(false); }}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-colors w-full text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </div>
          )}

          <motion.div whileHover={reduce ? undefined : { scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} className="hidden md:block">
            <Link
              href="/#audit"
              className="group relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold text-[#04140d] overflow-hidden shadow-md shadow-emerald-950/40"
              style={{ background: 'linear-gradient(180deg, #10b981, #059669)' }}
            >
              <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20" />
              <motion.span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={reduce ? undefined : { x: ['-120%', '220%'] }}
                transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              />
              <Zap className="relative w-3.5 h-3.5" />
              <span className="relative">Audit</span>
            </Link>
          </motion.div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-zinc-400 hover:text-ivory hover:bg-white/5 transition-colors"
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="md:hidden bg-obsidian/90 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3 space-y-1 overflow-hidden"
        >
          {PUBLIC_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'text-ivory bg-white/5' : 'text-zinc-400 hover:text-ivory hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isAuthenticated && user?.role !== 'ADMIN' && user?.role !== 'OWNER' && (
            <Link
              href="/dashboard"
              className="block px-3 py-2.5 rounded-lg text-sm text-jade-300 hover:bg-jade-500/10 transition-colors"
            >
              Dashboard
            </Link>
          )}
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <WalletButton />
            <Link
              href="/#audit"
              className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-[#04140d] text-sm font-semibold rounded-lg"
              style={{ background: 'linear-gradient(180deg, #10b981, #059669)' }}
            >
              <Zap className="w-3.5 h-3.5" />
              Run Audit
            </Link>
          </div>
        </motion.div>
      )}
      </div>
    </motion.header>
  );
}
