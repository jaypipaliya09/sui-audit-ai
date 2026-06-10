'use client';

import { useRouter } from 'next/navigation';
import { AuditProgress } from '@/components/AuditProgress';

export default function AuditProgressPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const handleComplete = (blobId: string, walrusUrl: string) => {
    router.push(`/report/${blobId}`);
  };

  return (
    <main className="min-h-screen bg-[#0d1117] text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8 text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          AI Analysis in Progress
        </h1>
        <p className="text-gray-400">
          Please do not close this window. We are auditing your contract and storing the results on the Walrus Network.
        </p>
      </div>
      
      <AuditProgress auditId={params.id} onComplete={handleComplete} />
    </main>
  );
}
