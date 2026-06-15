import { ReportViewer } from '@/components/ReportViewer';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';

async function getAuditReport(blobId: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${API_URL}/reports/blob/${blobId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch report');
    }
    return res.json();
  } catch (error) {
    console.error('Error fetching audit report:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { blobId: string };
}): Promise<Metadata> {
  const audit = await getAuditReport(params.blobId);
  if (!audit) return { title: 'Report Not Found — SuiAudit AI' };

  return {
    title: `${audit.contractName} Security Report — SuiAudit AI`,
    description: `AI security audit for ${audit.contractName}. Overall risk: ${audit.overallRisk}. ${audit.criticalCount} critical, ${audit.highCount} high, ${audit.mediumCount} medium findings.`,
  };
}

export default async function ReportPage({
  params,
}: {
  params: { blobId: string };
}) {
  const audit = await getAuditReport(params.blobId);

  if (!audit) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-gray-200 pt-20 pb-20 px-4 sm:px-6">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>

      <ReportViewer audit={audit} />
    </main>
  );
}
