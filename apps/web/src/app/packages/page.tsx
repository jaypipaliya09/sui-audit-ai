'use client';

import React, { useState } from 'react';
import { Shield, Zap, Copy, Check, Terminal, ExternalLink, Box, Activity, DollarSign, Image as ImageIcon, Briefcase, Database, Lock, Shuffle, Compass } from 'lucide-react';

const TRACKS = [
  {
    id: 'defi',
    name: 'DeFi Audit',
    track: 'DeFi',
    icon: Activity,
    color: 'from-blue-500 to-cyan-400',
    description: 'Specialized audit for Liquidity Pools, AMMs, DEX Logic, Yield Strategies, Vaults, and Treasury Management.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx defi-audit ./contract.move',
  },
  {
    id: 'deepbook',
    name: 'DeepBook Audit',
    track: 'DeepBook',
    icon: BookOpenIcon,
    color: 'from-indigo-500 to-purple-500',
    description: 'Comprehensive audit for DeepBook Integrations, Order Book Logic, Market Orders, and Trading Infrastructure.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx deepbook-audit ./contract.move',
  },
  {
    id: 'dex',
    name: 'DEX Audit',
    track: 'DEX',
    icon: Shuffle,
    color: 'from-green-400 to-emerald-600',
    description: 'Focused analysis on Cetus, Kriya, Turbos, Swap Logic, Router Logic, and Trading Pools.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx dex-audit ./contract.move',
  },
  {
    id: 'lending',
    name: 'Lending Audit',
    track: 'Lending',
    icon: DollarSign,
    color: 'from-yellow-400 to-orange-500',
    description: 'Security review for Scallop, NAVI, Suilend, Borrowing/Lending Logic, and Interest Calculations.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx lending-audit ./contract.move',
  },
  {
    id: 'nft',
    name: 'NFT Audit',
    track: 'NFT',
    icon: ImageIcon,
    color: 'from-pink-500 to-rose-500',
    description: 'Smart contract audit for NFT Collections, Minting, Marketplaces, and Royalty Logic.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx nft-audit ./contract.move',
  },
  {
    id: 'staking',
    name: 'Staking Audit',
    track: 'Staking',
    icon: Briefcase,
    color: 'from-teal-400 to-cyan-600',
    description: 'Audit Validator Staking, Liquid Staking, Reward Distribution, and Delegation Logic.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx staking-audit ./contract.move',
  },
  {
    id: 'stablecoin',
    name: 'Stablecoin Audit',
    track: 'Stablecoin',
    icon: Database,
    color: 'from-sky-400 to-blue-600',
    description: 'Audits for CDP Systems, Stablecoin Minting, Collateral Logic, and Peg Maintenance.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx stablecoin-audit ./contract.move',
  },
  {
    id: 'dao',
    name: 'DAO Audit',
    track: 'DAO',
    icon: Lock,
    color: 'from-fuchsia-500 to-purple-600',
    description: 'Assess Governance Contracts, Voting Logic, Proposal Systems, and Treasury Governance.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx dao-audit ./contract.move',
  },
  {
    id: 'aggregator',
    name: 'Aggregator Audit',
    track: 'Aggregator',
    icon: Box,
    color: 'from-orange-400 to-red-500',
    description: 'Examine Routing Logic, Multi-Protocol Execution, and Liquidity Aggregation.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx aggregator-audit ./contract.move',
  },
  {
    id: 'bridge',
    name: 'Bridge Audit',
    track: 'Bridge',
    icon: Compass,
    color: 'from-violet-500 to-indigo-600',
    description: 'Security testing for Cross-chain Messaging, Asset Bridging, and Lock/Mint Logic.',
    install: 'npm install @sui-audit-ai/cli',
    run: 'npx bridge-audit ./contract.move',
  },
];

function BookOpenIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export default function PackagesPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] pt-24 pb-20 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-fade-in">
            <Terminal className="w-4 h-4" />
            <span>CLI Tools for Developers</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white animate-fade-in-up">
            Track-Based <span className="gradient-text">Audit Packages</span>
          </h1>
          <p className="text-lg text-gray-400 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            Audit your Sui Move smart contracts directly from the terminal. We've built specialized AI models trained for every major ecosystem track.
          </p>

          {/* Pricing Model Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-[#30363d]/60 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-white font-bold mb-1">Free Plan</h3>
              <p className="text-sm text-gray-400">5 Audits / Month</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <h3 className="text-blue-400 font-bold mb-1">Pro Plan</h3>
              <p className="text-sm text-gray-400">100 Audits / Month</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <h3 className="text-purple-400 font-bold mb-1">Enterprise</h3>
              <p className="text-sm text-gray-400">Unlimited Audits</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            Installation is always free. Run <code className="text-white bg-white/10 px-1 rounded">npx &lt;track&gt;-audit login &lt;API_KEY&gt;</code> to authenticate.
          </p>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TRACKS.map((pkg, idx) => (
            <div 
              key={pkg.id}
              className="glass p-6 rounded-2xl border border-[#30363d]/60 hover:border-blue-500/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.color} p-0.5 shadow-lg`}>
                    <div className="w-full h-full bg-[#161b22] rounded-[10px] flex items-center justify-center">
                      <pkg.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{pkg.name}</h3>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Track: {pkg.track}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-6 h-16 line-clamp-3">
                {pkg.description}
              </p>

              {/* Install Command */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">1. Install</label>
                  <div className="relative">
                    <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 pr-10 font-mono text-sm text-gray-300 truncate">
                      {pkg.install}
                    </div>
                    <button
                      onClick={() => handleCopy(pkg.install, `${pkg.id}-install`)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-[#30363d] text-gray-400 hover:text-white transition-colors"
                      title="Copy install command"
                    >
                      {copiedId === `${pkg.id}-install` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Run Command */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">2. Audit</label>
                  <div className="relative">
                    <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 pr-10 font-mono text-sm text-green-400 truncate">
                      {pkg.run}
                    </div>
                    <button
                      onClick={() => handleCopy(pkg.run, `${pkg.id}-run`)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-[#30363d] text-gray-400 hover:text-white transition-colors"
                      title="Copy run command"
                    >
                      {copiedId === `${pkg.id}-run` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Hover effect highlight line */}
              <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${pkg.color} opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl`} />
            </div>
          ))}
        </div>
        
        {/* Footer info block */}
        <div className="mt-16 text-center max-w-2xl mx-auto p-6 glass rounded-2xl border border-[#30363d]/60 flex flex-col sm:flex-row items-center gap-6 justify-between animate-fade-in-up">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Shared Backend Architecture</h4>
              <p className="text-sm text-gray-400">All CLI tracks route to our high-performance AI engine.</p>
            </div>
          </div>
          <a href="/how-it-works" className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center gap-2">
            Read Docs
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>
  );
}
