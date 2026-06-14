'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Menu, X, Zap, BookOpen, Clock, Wallet } from 'lucide-react';
import { WalletButton } from '@/components/WalletButton';
import { useWallet } from '@/lib/walletContext';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Shield },
  { href: '/how-it-works', label: 'How It Works', icon: BookOpen },
  { href: '/verify', label: 'Verify On-Chain', icon: Shield },
  { href: '/#audit', label: 'Recent Audits', icon: Clock },
];

export function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass border-b border-[#30363d]/60 shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">
            Sui<span className="gradient-text">Audit</span> AI
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = link.href !== '/#audit' && pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTA + Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Wallet button — desktop */}
          <div className="hidden md:block">
            <WalletButton />
          </div>

          <Link
            href="/#audit"
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
          >
            <Zap className="w-4 h-4" />
            Run Audit
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden glass border-t border-[#30363d]/60 px-4 py-4 space-y-1 shadow-xl">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              <link.icon className="w-4 h-4 text-gray-500" />
              {link.label}
            </Link>
          ))}
          {isConnected && (
            <Link
              href="/my-audits"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors text-sm font-medium"
            >
              <Wallet className="w-4 h-4" />
              My Audits
            </Link>
          )}
          <div className="pt-2 border-t border-[#30363d]/60 space-y-2">
            <WalletButton />
            <Link
              href="/#audit"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              Run Audit
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
