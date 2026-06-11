'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Wallet, Copy, Check, LogOut, ChevronDown, ExternalLink, AlertCircle, Zap } from 'lucide-react';
import { useWallet } from '@/lib/walletContext';

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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#21262d]">
          <div className="flex items-center gap-3">
            {/* Sui Logo */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4DA2FF] to-[#0059B3] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Connect Slush Wallet</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Official Sui Network wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#21262d] text-gray-500 hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Status indicator */}
          <div className={`rounded-xl border p-4 transition-all ${
            isChecking
              ? 'border-[#30363d] bg-[#161b22]'
              : isInstalled
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-orange-500/20 bg-orange-500/5'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isChecking ? 'bg-[#21262d]' : isInstalled ? 'bg-green-500/15' : 'bg-orange-500/10'
              }`}>
                {isChecking ? (
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
                ) : (
                  <span className="text-xl">🌊</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">Slush · Sui Wallet</span>
                  {isChecking ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20">
                      Detecting…
                    </span>
                  ) : isInstalled ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium border border-green-500/20">
                      ● Detected
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-medium border border-orange-500/20">
                      Not installed
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isChecking
                    ? 'Scanning for browser extension…'
                    : isInstalled
                    ? 'Extension ready — click below to connect'
                    : 'Install the Slush extension to continue'}
                </p>
              </div>
            </div>
          </div>

          {/* What you get */}
          <div className="space-y-2">
            {[
              { icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />, text: 'Pay 1 SUI per audit automatically' },
              { icon: <Wallet className="w-3.5 h-3.5 text-blue-400" />, text: 'Track all your audit history' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-gray-400">
                {item.icon}
                {item.text}
              </div>
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
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              status === 'success'
                ? 'bg-green-600 text-white cursor-default'
                : status === 'connecting'
                ? 'bg-blue-600/60 text-white cursor-wait'
                : isChecking
                ? 'bg-[#21262d] text-gray-500 cursor-wait'
                : isInstalled
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95'
                : 'bg-[#21262d] hover:bg-[#2d333b] text-gray-300 border border-[#30363d]'
            }`}
          >
            {(status === 'connecting' || isChecking) && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
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
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <p className="text-[11px] text-gray-600 text-center">
            Your address is stored locally only. We never access your private keys.
          </p>
        </div>
      </div>
    </div>
  );
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
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#1c2128] transition-colors text-sm"
      >
        {/* Slush avatar */}
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4DA2FF] to-[#0059B3] flex items-center justify-center shadow-sm">
          <span className="text-[9px]">🌊</span>
        </div>
        <span className="font-mono text-gray-300 text-xs">{shortAddr(address)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeInUp">
            {/* Wallet header */}
            <div className="p-4 border-b border-[#21262d]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4DA2FF] to-[#0059B3] flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-base">🌊</span>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Connected via</div>
                  <div className="font-bold text-white text-sm">Slush · Sui Wallet</div>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[10px] text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Testnet
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#161b22] rounded-lg border border-[#21262d]">
                <span className="font-mono text-xs text-gray-400 truncate flex-1">{address}</span>
                <button onClick={copyAddress} className="shrink-0 text-gray-500 hover:text-gray-200 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 border-b border-[#21262d]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">My Audits</span>
                <span className="text-sm font-bold text-white">{myAuditCount}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3">
              <a
                href="/my-audits"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-[#21262d] transition-colors"
              >
                <Wallet className="w-4 h-4 text-gray-500" />
                My Audits
              </a>
              <button
                onClick={() => { onDisconnect(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mt-1"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
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
        className="flex items-center gap-2 px-4 py-2 border border-[#30363d] hover:border-[#4DA2FF]/50 bg-[#161b22] hover:bg-[#1c2128] text-gray-300 hover:text-white text-sm font-semibold rounded-xl transition-all"
      >
        <span className="text-sm">🌊</span>
        Connect Slush
      </button>
      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
    </>
  );
}
