'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, Copy, Check, LogOut, ChevronDown, ExternalLink, AlertCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '@/lib/walletContext';
import { copyText } from '@/lib/clipboard';

import { getWallets } from '@wallet-standard/app';

/* ─── Slush / Sui Wallet detection ──────────────────────────── */
declare global {
  interface Window {
    suiWallet?: any;
    sui?: any;
    slush?: any;
  }
}

const SUI_INSTALL_URL = 'https://slush.app';

/**
 * Tries EVERY known injection point for the official Sui / Slush wallet:
 * 1. Legacy globals: window.suiWallet, window.sui, window.slush
 * 2. Wallet Standard: getWallets() from @wallet-standard/app
 */
function getSuiProvider(): any | null {
  if (typeof window === 'undefined') return null;

  // Legacy globals
  if (window.suiWallet) return window.suiWallet;
  if (window.slush) return window.slush;
  if (window.sui) return window.sui;

  // Wallet Standard API
  try {
    const walletsApi = getWallets();
    const wallets = walletsApi.get();
    const suiWallet = wallets?.find(
      (w: any) =>
        w.name?.toLowerCase().includes('sui') ||
        w.name?.toLowerCase().includes('slush')
    );
    if (suiWallet) return suiWallet;
  } catch {}

  return null;
}

function shortAddr(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

/* ─── Connect Modal ──────────────────────────────────────────────── */
interface ConnectModalProps {
  onClose: () => void;
}

function ConnectModal({ onClose }: ConnectModalProps) {
  const { connect } = useWallet();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // show spinner while polling

  // Robust detection: poll repeatedly + listen for wallet standard events
  useEffect(() => {
    let cancelled = false;

    const check = () => {
      if (!cancelled) {
        const found = !!getSuiProvider();
        setIsInstalled(found);
        if (found) setIsChecking(false); // extension found, stop spinner
      }
    };

    // Immediate check
    check();

    // Poll at 200ms, 500ms, 1s, 2s, 3s — covers slow extension injection
    const timers = [200, 500, 1000, 2000, 3000].map((ms) => setTimeout(check, ms));

    // After 3s max, always stop the checking spinner
    const stopChecking = setTimeout(() => { if (!cancelled) setIsChecking(false); }, 3000);

    // Also listen for Wallet Standard registration events
    const handleWalletRegister = () => check();
    window.addEventListener('wallet:register', handleWalletRegister);
    // Some wallets fire a custom event
    window.addEventListener('suiWalletRegistered', handleWalletRegister);

    // Listen to Wallet Standard changes using @wallet-standard/app
    let unsub: (() => void) | undefined;
    try {
      const walletsApi = getWallets();
      unsub = walletsApi.on('register', handleWalletRegister);
    } catch {}

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearTimeout(stopChecking);
      window.removeEventListener('wallet:register', handleWalletRegister);
      window.removeEventListener('suiWalletRegistered', handleWalletRegister);
      unsub?.();
    };
  }, []);

  // Premium UX: close on Escape, lock background scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleConnect = useCallback(async () => {
    // Re-probe at click time — in case polling missed it
    const provider = getSuiProvider();

    if (!provider) {
      // No extension found → redirect to install page
      window.open(SUI_INSTALL_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      // Request permissions / connect (handles both legacy + wallet standard APIs)
      if (typeof provider.requestPermissions === 'function') {
        await provider.requestPermissions();
      } else if (typeof provider.connect === 'function') {
        await provider.connect();
      } else if (typeof provider.features?.['standard:connect']?.connect === 'function') {
        await provider.features['standard:connect'].connect();
      }

      // Fetch active account (handles both legacy + wallet standard APIs)
      let address: string | null = null;

      if (typeof provider.getAccounts === 'function') {
        const accounts = await provider.getAccounts();
        address = accounts?.[0]?.address ?? accounts?.[0] ?? null;
      } else if (typeof provider.getAccount === 'function') {
        const acc = await provider.getAccount();
        address = acc?.address ?? acc ?? null;
      } else if (Array.isArray(provider.accounts)) {
        // Wallet Standard: accounts is a reactive array
        address = provider.accounts?.[0]?.address ?? null;
      } else if (provider.features?.['standard:connect']) {
        const result = await provider.features['standard:connect'].connect();
        address = result?.accounts?.[0]?.address ?? null;
      }

      if (!address) throw new Error('No account found. Make sure you are logged into Slush and have at least one account.');

      setStatus('success');
      connect(address, provider, 'sui');
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please try again.');
      setStatus('error');
    }
  }, [connect, onClose]);

  const canConnect = isInstalled && status === 'idle';

  const modal = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal — gradient-bordered premium glass card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        role="dialog"
        aria-modal="true"
        aria-label="Connect Slush Wallet"
        className="relative w-full max-w-sm rounded-2xl p-px overflow-hidden shadow-2xl shadow-black/60"
      >
        <div aria-hidden className="absolute inset-0 rounded-2xl opacity-80" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.42), rgba(212,189,138,0.14) 45%, rgba(255,255,255,0.04) 78%)' }} />

        <div className="relative rounded-2xl bg-[#0b0b0f]/95 backdrop-blur-2xl overflow-hidden">
          {/* champagne top hairline + ambient glow */}
          <div aria-hidden className="absolute top-0 inset-x-0 h-px rule-champagne" />
          <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-[300px] h-[180px] rounded-full blur-[90px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.13), transparent 70%)' }} />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#4DA2FF] to-[#0059B3] flex items-center justify-center shadow-lg shadow-blue-500/25 overflow-hidden">
                <span aria-hidden className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-xl" />
                <span className="relative text-base">🌊</span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-ivory tracking-tight">Connect Slush Wallet</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">Official Sui Network wallet</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-ivory transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="relative p-6 space-y-4">
            {/* Status indicator */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-xl border p-4 transition-colors duration-300 ${
                isChecking
                  ? 'border-white/[0.08] bg-white/[0.02]'
                  : isInstalled
                  ? 'border-emerald-500/25 bg-emerald-500/[0.05]'
                  : 'border-amber-500/20 bg-amber-500/[0.05]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isChecking ? 'bg-white/[0.04]' : isInstalled ? 'bg-emerald-500/15' : 'bg-amber-500/10'
                }`}>
                  {isChecking ? (
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-jade-400 rounded-full animate-spin" />
                  ) : (
                    <span className="text-xl">🌊</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ivory text-sm">Slush · Sui Wallet</span>
                    {isChecking ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-jade-500/10 text-jade-300 font-medium border border-jade-500/20">
                        Detecting…
                      </span>
                    ) : isInstalled ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/25">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </span>
                        Detected
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium border border-amber-500/25">
                        Not installed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {isChecking
                      ? 'Scanning for browser extension…'
                      : isInstalled
                      ? 'Extension ready — click below to connect'
                      : 'Install the Slush extension to continue'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* What you get */}
            <div className="space-y-2">
              {[
                { icon: <Zap className="w-3.5 h-3.5 text-champagne-400" />, text: 'Pay 1 SUI per audit automatically' },
                { icon: <Wallet className="w-3.5 h-3.5 text-jade-400" />, text: 'Track all your audit history' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2.5 text-xs text-zinc-400"
                >
                  {item.icon}
                  {item.text}
                </motion.div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleConnect}
              disabled={status === 'connecting' || status === 'success' || isChecking}
              style={canConnect ? { background: 'linear-gradient(180deg, #10b981, #059669)' } : undefined}
              className={`group relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm overflow-hidden transition-all duration-300 ${
                status === 'success'
                  ? 'bg-emerald-600 text-white cursor-default'
                  : status === 'connecting'
                  ? 'bg-emerald-600/60 text-white cursor-wait'
                  : isChecking
                  ? 'bg-white/[0.04] text-zinc-500 cursor-wait border border-white/[0.08]'
                  : isInstalled
                  ? 'text-[#04140d] shadow-lg shadow-emerald-950/40 active:scale-[0.98]'
                  : 'bg-white/[0.04] hover:bg-white/[0.07] text-zinc-200 border border-white/[0.1]'
              }`}
            >
              {canConnect && (
                <>
                  <span aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-120%', '220%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                  />
                </>
              )}
              {(status === 'connecting' || isChecking) && (
                <div className="relative w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span className="relative inline-flex items-center gap-2">
                {status === 'success' ? (
                  <><Check className="w-4 h-4" /> Connected!</>
                ) : status === 'connecting' ? (
                  'Connecting…'
                ) : isChecking ? (
                  'Detecting wallet…'
                ) : isInstalled ? (
                  <><Wallet className="w-4 h-4" /> Connect Slush Wallet</>
                ) : (
                  <><ExternalLink className="w-4 h-4" /> Install Slush Wallet</>
                )}
              </span>
            </button>
          </div>

          {/* Footer */}
          <div className="relative px-6 pb-5">
            <p className="text-[11px] text-zinc-600 text-center">
              Your address is stored locally only. We never access your private keys.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}

/* ─── Connected Dropdown ─────────────────────────────────────────── */
interface ConnectedDropdownProps {
  address: string;
  onDisconnect: () => void;
  myAuditCount: number;
}

function ConnectedDropdown({ address, onDisconnect, myAuditCount }: ConnectedDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (await copyText(address)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#08080a]/80 backdrop-blur-md transition-all duration-300 shadow-premium-sm hover:-translate-y-0.5 border border-white/[0.08] hover:border-emerald-400/40"
      >
        <div aria-hidden className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Slush avatar */}
        <div className="relative z-10 w-5 h-5 rounded-full bg-gradient-to-br from-[#4DA2FF] to-[#0059B3] flex items-center justify-center shadow-[0_0_8px_rgba(77,162,255,0.4)]">
          <span className="text-[9px]">🌊</span>
        </div>
        <span className="relative z-10 font-mono text-ivory text-xs font-semibold">{shortAddr(address)}</span>
        <ChevronDown className={`relative z-10 w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-72 glass-panel overflow-hidden z-50"
          >
            <div className="absolute top-0 inset-x-0 h-px rule-champagne" />
            {/* Wallet header */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4DA2FF] to-[#0059B3] flex items-center justify-center shadow-[0_0_15px_rgba(77,162,255,0.3)]">
                  <span className="text-base">🌊</span>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Connected via</div>
                  <div className="font-bold text-ivory text-sm">Slush · Sui Wallet</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[glow-pulse_2s_infinite]" />
                  Testnet
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-[#0a0a0c]/80 rounded-xl border border-white/[0.04] shadow-inner">
                <span className="font-mono text-xs text-zinc-400 truncate flex-1">{address}</span>
                <button onClick={copyAddress} className="shrink-0 text-zinc-500 hover:text-emerald-400 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 border-b border-white/[0.06] bg-gradient-to-b from-transparent to-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">My Audits</span>
                <span className="text-sm font-bold text-ivory">{myAuditCount}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <a
                href="/my-audits"
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-ivory hover:bg-white/5 transition-colors group"
              >
                <Wallet className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                My Audits
              </a>
              <button
                onClick={() => { onDisconnect(); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mt-1 group"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Disconnect
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ─── Main exported component ────────────────────────────────────── */
export function WalletButton() {
  const { address, isConnected, disconnect, myAudits } = useWallet();
  const [showModal, setShowModal] = useState(false);

  if (isConnected && address) {
    return (
      <ConnectedDropdown address={address} onDisconnect={disconnect} myAuditCount={myAudits.length} />
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative group flex items-center gap-2 px-5 py-2.5 bg-[#08080a]/80 backdrop-blur-md text-ivory text-sm font-bold rounded-xl transition-all duration-300 shadow-premium-sm hover:-translate-y-0.5"
      >
        <div className="absolute inset-0 rounded-xl border border-white/[0.08] transition-colors duration-300 group-hover:border-emerald-400/40" />
        <div aria-hidden className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="relative z-10 text-sm">🌊</span>
        <span className="relative z-10">Connect Slush</span>
        <div className="absolute -inset-0.5 rounded-xl bg-emerald-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </button>
      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
    </>
  );
}
