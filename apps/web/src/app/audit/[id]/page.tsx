'use client';

import { useRouter } from 'next/navigation';
import { AuditProgress } from '@/components/AuditProgress';
import { Shield, Clock, Globe, Lock } from 'lucide-react';
import { useWallet } from '@/lib/walletContext';
import { api } from '@/lib/api';

const AUDIT_FACTS = [
  { icon: Shield, text: 'Analyzing 14 vulnerability categories' },
  { icon: Clock, text: 'Most audits complete in under 60s' },
  { icon: Globe, text: 'Stored permanently on Walrus' },
  { icon: Lock, text: 'Source code is never stored' },
];

export default function AuditProgressPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { saveAudit, isConnected } = useWallet();

  const handleComplete = async (blobId: string) => {
    if (isConnected) {
      try {
        const report = await api.getAuditReport(params.id);
        saveAudit({
          auditId: params.id,
          blobId,
          contractName: report.contractName || 'Contract',
          createdAt: report.createdAt || new Date().toISOString(),
          overallRisk: report.overallRisk,
          kind: 'direct',
        });
      } catch {}
    }
    router.push(`/report/${blobId}`);
  };

  return (
    <main className="min-h-screen bg-obsidian flex flex-col items-center justify-center p-4 pt-20 relative overflow-hidden">
      {/* Ambient glowing orb */}
      <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full blur-[150px] bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 w-full max-w-2xl text-center mb-10 animate-fadeInUp">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[glow-pulse_2s_infinite]" />
          AI Analysis Running
        </div>
        <h1 className="text-3xl md:text-5xl font-display font-medium text-ivory tracking-tight mb-4 drop-shadow-md">
          Auditing Your <span className="lux-gradient">Contract</span>
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Claude Sonnet 4 is deeply analyzing your contract for security vulnerabilities.
          Please keep this tab open.
        </p>
      </div>

      {/* Progress */}
      <div className="relative z-10 w-full max-w-xl animate-fadeInUp glass-panel p-6" style={{ animationDelay: '0.15s' }}>
        <AuditProgress auditId={params.id} onComplete={handleComplete} />
      </div>

      {/* Info cards */}
      <div className="relative z-10 w-full max-w-xl mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        {AUDIT_FACTS.map((fact) => (
          <div
            key={fact.text}
            className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-center hover:bg-white/[0.03] transition-colors"
          >
            <fact.icon className="w-4 h-4 text-emerald-500/60" />
            <p className="text-[10px] uppercase font-semibold tracking-wide text-zinc-500 leading-snug">{fact.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
