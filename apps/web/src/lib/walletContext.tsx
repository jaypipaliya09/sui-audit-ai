'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

export interface DetectedWallet {
  id: string;
  name: string;
  icon: string;
  description: string;
  installUrl: string;
  getProvider: () => any | null;
}

export const SUPPORTED_WALLETS: DetectedWallet[] = [
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

export interface SavedAudit {
  auditId: string;
  blobId: string;
  contractName: string;
  createdAt: string;
  overallRisk?: string;
}

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  provider: any | null;
  connect: (addr: string, currentProvider?: any, walletId?: string) => void;
  disconnect: () => void;
  myAudits: SavedAudit[];
  saveAudit: (audit: SavedAudit) => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  provider: null,
  connect: () => {},
  disconnect: () => {},
  myAudits: [],
  saveAudit: () => {},
});

const STORAGE_KEY = 'suiaudit_wallet';
const WALLET_ID_KEY = 'suiaudit_wallet_id';
const AUDITS_KEY = 'suiaudit_my_audits';

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [myAudits, setMyAudits] = useState<SavedAudit[]>([]);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const storedAddr = localStorage.getItem(STORAGE_KEY);
      const storedWalletId = localStorage.getItem(WALLET_ID_KEY);
      
      if (storedAddr) {
        setAddress(storedAddr);
        
        // Try to reconnect provider
        if (storedWalletId) {
          if (storedWalletId === 'demo') {
            setProvider('demo');
          } else {
            const wallet = SUPPORTED_WALLETS.find((w) => w.id === storedWalletId);
            if (wallet) {
              // Wait slightly for extensions to inject window objects
              setTimeout(() => {
                const p = wallet.getProvider();
                if (p) setProvider(p);
              }, 500);
            }
          }
        }
      }
      
      const audits = localStorage.getItem(AUDITS_KEY);
      if (audits) setMyAudits(JSON.parse(audits));
    } catch {}
  }, []);

  const [provider, setProvider] = useState<any | null>(null);

  const connect = (addr: string, currentProvider?: any, walletId?: string) => {
    setAddress(addr);
    setProvider(currentProvider);
    localStorage.setItem(STORAGE_KEY, addr);
    if (walletId) localStorage.setItem(WALLET_ID_KEY, walletId);
    // Load this wallet's audits
    try {
      const key = `${AUDITS_KEY}_${addr}`;
      const audits = localStorage.getItem(key);
      if (audits) setMyAudits(JSON.parse(audits));
    } catch {}
  };

  const disconnect = () => {
    setAddress(null);
    setProvider(null);
    setMyAudits([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WALLET_ID_KEY);
  };

  const saveAudit = (audit: SavedAudit) => {
    if (!address) return;
    const updated = [audit, ...myAudits.filter((a) => a.auditId !== audit.auditId)].slice(0, 50);
    setMyAudits(updated);
    localStorage.setItem(`${AUDITS_KEY}_${address}`, JSON.stringify(updated));
  };

  return (
    <WalletContext.Provider value={{ address, isConnected: !!address, provider, connect, disconnect, myAudits, saveAudit }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
