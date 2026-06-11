'use client';

import { useRouter } from 'next/navigation';
import { AuditProgress } from '@/components/AuditProgress';
import { Shield, Clock, Globe, Lock } from 'lucide-react';

const AUDIT_FACTS = [
  { icon: Shield, text: 'Analyzing 14 vulnerability categories' },
  { icon: Clock, text: 'Most audits complete in under 60 seconds' },
  { icon: Globe, text: 'Report will be stored permanently on Walrus' },
  { icon: Lock, text: 'Your source code is never stored permanently' },
];

export default function AuditProgressPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const handleComplete = (blobId: string) => {
    router.push(`/report/${blobId}`);
  };

  return (
    <main className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-4 pt-24">
      {/* Hero text */}
      <div className="w-full max-w-3xl text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          AI Analysis Running
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          Auditing Your Contract
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto text-sm">
          Please keep this tab open. Claude Sonnet 4 is analyzing your contract for security vulnerabilities.
        </p>
      </div>

      {/* Progress Card */}
      <div className="w-full max-w-2xl">
        <AuditProgress auditId={params.id} onComplete={handleComplete} />
      </div>

      {/* Info cards below */}
      <div className="w-full max-w-2xl mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {AUDIT_FACTS.map((fact) => (
          <div
            key={fact.text}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#21262d] bg-[#161b22] text-center"
          >
            <fact.icon className="w-4 h-4 text-gray-500" />
            <p className="text-xs text-gray-600 leading-snug">{fact.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
