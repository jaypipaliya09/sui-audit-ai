'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Menu, X, Zap, ChevronDown, LogOut, LayoutDashboard, User } from 'lucide-react';
import { WalletButton } from '@/components/WalletButton';
import { useWallet } from '@/lib/walletContext';
import { useAuth } from '@/lib/auth';

const PUBLIC_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/my-audits', label: 'My Audits' },
  { href: '/verify', label: 'Verify' },
];

export function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useWallet();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Hide default navbar on dashboard and auth pages (they have their own layout)
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
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'glass border-b border-zinc-800/60'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">
            SuiAudit<span className="text-indigo-400"> AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {PUBLIC_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-white/5'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {link.label}
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
                <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-semibold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl shadow-black/30 overflow-hidden z-50 animate-fadeInDown">
                    <div className="px-3 py-2.5 border-b border-zinc-800">
                      <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                    </Link>
                    <button
                      onClick={async () => { await logout(); setShowUserMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-colors w-full text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <Link
            href="/#audit"
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-medium rounded-lg transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Audit
          </Link>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden glass border-t border-zinc-800 px-4 py-3 space-y-1 animate-fadeInDown">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated && user?.role !== 'ADMIN' && user?.role !== 'OWNER' && (
            <Link
              href="/dashboard"
              className="block px-3 py-2.5 rounded-lg text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            >
              Dashboard
            </Link>
          )}
          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <WalletButton />
            <Link
              href="/#audit"
              className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Run Audit
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
