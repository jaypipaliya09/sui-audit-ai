'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Shield, Clock, ArrowRight, ChevronLeft, ExternalLink, Zap } from 'lucide-react';
import { useWallet } from '@/lib/walletContext';
import { RiskBadge } from '@/components/RiskBadge';

function shortAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export default function MyAuditsPage() {
  const router = useRouter();
  const { address, isConnected, myAudits } = useWallet();

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-[#0d1117] flex items-center justify-center pt-16 p-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Wallet className="w-10 h-10 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white mb-3">My Audits</h1>
            <p className="text-gray-500 leading-relaxed">
              Connect your Sui wallet to see all the audits you have submitted. Your audit history is stored locally per wallet.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 border border-[#30363d] hover:border-[#444c56] text-gray-300 hover:text-white rounded-xl transition-all font-medium text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Go Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1117] pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">My Audits</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Wallet className="w-3 h-3 text-white" />
                </div>
                <span className="font-mono text-xs text-gray-500">{address && shortAddr(address)}</span>
              </div>
            </div>
            <Link
              href="/#audit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
            >
              <Zap className="w-4 h-4" />
              New Audit
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Audits', value: myAudits.length },
            { label: 'Completed', value: myAudits.filter((a) => a.blobId).length },
            { label: 'Critical Found', value: myAudits.filter((a) => a.overallRisk === 'CRITICAL').length },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl border border-[#21262d] bg-[#161b22] text-center">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Audit list */}
        {myAudits.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#30363d] rounded-2xl">
            <Shield className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400 mb-2">No audits yet</h3>
            <p className="text-gray-600 text-sm mb-6">Submit your first Sui Move contract to get started.</p>
            <Link
              href="/#audit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all"
            >
              Run Your First Audit
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myAudits.map((audit, idx) => (
              <div
                key={audit.auditId}
                onClick={() => audit.blobId && router.push(`/report/${audit.blobId}`)}
                className={`group flex items-center gap-4 p-5 rounded-xl border border-[#21262d] bg-[#161b22] transition-all duration-200 ${
                  audit.blobId
                    ? 'hover:bg-[#1c2128] hover:border-[#30363d] cursor-pointer hover:-translate-y-0.5'
                    : 'opacity-70'
                }`}
              >
                {/* Index */}
                <div className="shrink-0 w-8 h-8 rounded-lg bg-[#21262d] flex items-center justify-center text-xs font-bold text-gray-500">
                  {idx + 1}
                </div>

                {/* Contract info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
                      {audit.contractName}
                    </h3>
                    {audit.overallRisk && <RiskBadge level={audit.overallRisk} />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(audit.createdAt).toLocaleString()}
                    </span>
                    {audit.blobId && (
                      <span className="font-mono">{audit.blobId.slice(0, 16)}…</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {audit.blobId ? (
                    <>
                      <a
                        href={`https://aggregator-devnet.walrus.space/v1/${audit.blobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-[#21262d] transition-colors"
                        title="View on Walrus"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <div className="p-2 rounded-lg text-gray-500 group-hover:text-gray-200 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg">Processing…</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
