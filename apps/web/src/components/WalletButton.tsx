'use client';

import React, { useState, useEffect } from 'react';
import { X, Wallet, AlertCircle, CheckCircle2, ExternalLink, Copy, Check, LogOut, ChevronDown } from 'lucide-react';
import { useWallet } from '@/lib/walletContext';

/* ─── Sui Wallet detection ───────────────────────────────────────── */
declare global {
  interface Window {
    suiWallet?: any;
    sui?: any;
    suiet?: any;
    martian?: any;
    okxwallet?: { sui?: any };
    ethos?: any;
    glass?: any;
  }
}

interface DetectedWallet {
  id: string;
  name: string;
  icon: string;
  description: string;
  installUrl: string;
  getProvider: () => any | null;
}

const SUPPORTED_WALLETS: DetectedWallet[] = [
  {
    id: 'sui',
    name: 'Sui Wallet',
    icon: '🌊',
    description: 'Official Sui Foundation wallet',
    installUrl: 'https://suiwallet.com',
    getProvider: () => (typeof window !== 'undefined' ? window.suiWallet || window.sui : null),
  },
  {
    id: 'suiet',
    name: 'Suiet',
    icon: '⚡',
    description: 'Community-built Sui wallet',
    installUrl: 'https://suiet.app',
    getProvider: () => (typeof window !== 'undefined' ? window.suiet : null),
  },
  {
    id: 'martian',
    name: 'Martian Wallet',
    icon: '🚀',
    description: 'Multi-chain Sui wallet',
    installUrl: 'https://martianwallet.xyz',
    getProvider: () => (typeof window !== 'undefined' ? window.martian : null),
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '⭕',
    description: 'OKX exchange wallet',
    installUrl: 'https://www.okx.com/web3',
    getProvider: () => (typeof window !== 'undefined' ? window.okxwallet?.sui : null),
  },
  {
    id: 'demo',
    name: 'Demo Mode',
    icon: '🎭',
    description: 'Use a demo wallet address for testing',
    installUrl: '',
    getProvider: () => 'demo',
  },
];

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
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<string[]>([]);

  useEffect(() => {
    // Detect installed wallets after mount
    const detected: string[] = [];
    SUPPORTED_WALLETS.forEach((w) => {
      if (w.id !== 'demo' && w.getProvider()) detected.push(w.id);
    });
    setDetectedWallets(detected);
  }, []);

  const handleConnect = async (wallet: DetectedWallet) => {
    setConnecting(wallet.id);
    setError(null);

    try {
      if (wallet.id === 'demo') {
        const demo = process.env.NEXT_PUBLIC_DEMO_WALLET_ADDRESS || `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`;
        connect(demo);
        onClose();
        return;
      }

      const provider = wallet.getProvider();
      if (!provider) {
        throw new Error(`${wallet.name} not detected. Please install it first.`);
      }

      // Try standard Sui wallet API
      if (provider.requestPermissions) {
        await provider.requestPermissions();
      } else if (provider.connect) {
        await provider.connect();
      }

      let address: string | null = null;

      if (provider.getAccounts) {
        const accounts = await provider.getAccounts();
        address = accounts?.[0]?.address ?? accounts?.[0] ?? null;
      } else if (provider.getAccount) {
        const acc = await provider.getAccount();
        address = acc?.address ?? acc ?? null;
      }

      if (!address) throw new Error('No account returned from wallet');

      connect(address, provider);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#21262d]">
          <div>
            <h2 className="text-lg font-black text-white">Connect Wallet</h2>
            <p className="text-xs text-gray-500 mt-0.5">Connect your Sui wallet to track your audits</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#21262d] text-gray-500 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet list */}
        <div className="p-4 space-y-2">
          {SUPPORTED_WALLETS.map((wallet) => {
            const isDetected = wallet.id === 'demo' || detectedWallets.includes(wallet.id);
            const isConnecting = connecting === wallet.id;

            return (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet)}
                disabled={!!connecting}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group
                  ${wallet.id === 'demo'
                    ? 'border-dashed border-[#30363d] hover:border-blue-500/40 hover:bg-blue-500/5'
                    : isDetected
                    ? 'border-[#21262d] hover:border-[#30363d] hover:bg-[#1c2128]'
                    : 'border-[#1a1f27] opacity-60 cursor-not-allowed'
                  }`}
              >
                <span className="text-2xl w-10 h-10 flex items-center justify-center bg-[#21262d] rounded-xl shrink-0">
                  {wallet.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-200 text-sm">{wallet.name}</span>
                    {isDetected && wallet.id !== 'demo' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">
                        Detected
                      </span>
                    )}
                    {!isDetected && wallet.id !== 'demo' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-500 font-medium">
                        Not installed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{wallet.description}</p>
                </div>
                <div className="shrink-0">
                  {isConnecting ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : !isDetected && wallet.installUrl ? (
                    <a
                      href={wallet.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      Install <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600 -rotate-90 group-hover:text-gray-400 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="px-6 py-4 border-t border-[#21262d]">
          <p className="text-xs text-gray-600 text-center">
            By connecting, your wallet address is stored locally only. We never store private keys.
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
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <Wallet className="w-3 h-3 text-white" />
        </div>
        <span className="font-mono text-gray-300 text-xs">{shortAddr(address)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeInUp">
            {/* Wallet header */}
            <div className="p-4 border-b border-[#21262d]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Connected Wallet</div>
                  <div className="font-bold text-white text-sm">Sui Wallet</div>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[10px] text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Live
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-[#0d1117] rounded-lg">
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
      <>
        <ConnectedDropdown address={address} onDisconnect={disconnect} myAuditCount={myAudits.length} />
        {/* Accessible "My Audits" quick link with count badge */}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 border border-[#30363d] hover:border-blue-500/50 bg-[#161b22] hover:bg-[#1c2128] text-gray-300 hover:text-white text-sm font-semibold rounded-xl transition-all"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
    </>
  );
}
