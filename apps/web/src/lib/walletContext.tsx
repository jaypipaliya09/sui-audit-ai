'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
  connect: (addr: string, currentProvider?: any) => void;
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
const AUDITS_KEY = 'suiaudit_my_audits';

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [myAudits, setMyAudits] = useState<SavedAudit[]>([]);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAddress(stored);
      const audits = localStorage.getItem(AUDITS_KEY);
      if (audits) setMyAudits(JSON.parse(audits));
    } catch {}
  }, []);

  const [provider, setProvider] = useState<any | null>(null);

  const connect = (addr: string, currentProvider?: any) => {
    setAddress(addr);
    setProvider(currentProvider);
    localStorage.setItem(STORAGE_KEY, addr);
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
