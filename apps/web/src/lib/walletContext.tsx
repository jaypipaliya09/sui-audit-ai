'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

/* ─── Sui / Slush Wallet provider ───────────────────────────────── */
declare global {
  interface Window {
    suiWallet?: any;
    sui?: any;
  }
}

import { getWallets } from '@wallet-standard/app';

/** Returns the Slush / Sui Wallet browser extension provider, or null */
function getSuiExtensionProvider(): any | null {
  if (typeof window === 'undefined') return null;

  // Legacy globals
  if ((window as any).suiWallet) return (window as any).suiWallet;
  if ((window as any).slush) return (window as any).slush;
  if ((window as any).sui) return (window as any).sui;

  // Wallet Standard API
  try {
    const walletsApi = getWallets();
    const wallets = walletsApi.get();
    const found = wallets?.find(
      (w: any) =>
        w.name?.toLowerCase().includes('sui') ||
        w.name?.toLowerCase().includes('slush')
    );
    if (found) return found;
  } catch {}

  return null;
}

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

  // Restore session from localStorage and reconnect provider
  useEffect(() => {
    try {
      const storedAddr = localStorage.getItem(STORAGE_KEY);
      const storedWalletId = localStorage.getItem(WALLET_ID_KEY);

      if (storedAddr) {
        setAddress(storedAddr);

        // Only re-attach the Slush/Sui wallet provider
        if (storedWalletId === 'sui') {
          // Extensions inject with a slight delay — retry up to 3s
          let attempts = 0;
          const interval = setInterval(() => {
            const p = getSuiExtensionProvider();
            if (p) {
              setProvider(p);
              clearInterval(interval);
              // Silently establish standard connection to populate provider.accounts
              if (p.features?.['standard:connect']?.connect) {
                p.features['standard:connect'].connect().catch(() => {});
              }
            }
            if (++attempts >= 6) clearInterval(interval); // give up after 3s
          }, 500);
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
