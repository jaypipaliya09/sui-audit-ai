'use client';

import { useRouter } from 'next/navigation';
import { AuditProgress } from '@/components/AuditProgress';
import { Shield, Clock, Globe, Lock } from 'lucide-react';

const AUDIT_FACTS = [
  { icon: Shield, text: 'Analyzing 14 vulnerability categories' },
  { icon: Clock, text: 'Most audits complete in under 60s' },
  { icon: Globe, text: 'Stored permanently on Walrus' },
  { icon: Lock, text: 'Source code is never stored' },
];

export default function AuditProgressPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const handleComplete = (blobId: string) => {
    router.push(`/report/${blobId}`);
  };

  return (
    <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 pt-20">
      {/* Header */}
      <div className="w-full max-w-2xl text-center mb-10 animate-fadeIn">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/8 text-indigo-400 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI Analysis Running
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
          Auditing Your Contract
        </h1>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Claude Sonnet 4 is analyzing your contract for security vulnerabilities.
          Keep this tab open.
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-xl animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
        <AuditProgress auditId={params.id} onComplete={handleComplete} />
      </div>

      {/* Info cards */}
      <div className="w-full max-w-xl mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        {AUDIT_FACTS.map((fact) => (
          <div
            key={fact.text}
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/50 text-center"
          >
            <fact.icon className="w-3.5 h-3.5 text-zinc-600" />
            <p className="text-[11px] text-zinc-600 leading-snug">{fact.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
