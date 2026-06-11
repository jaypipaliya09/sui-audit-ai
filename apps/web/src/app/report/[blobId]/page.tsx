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
    <main className="min-h-screen bg-[#0d1117] text-gray-200 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <ReportViewer audit={audit} />
    </main>
  );
}
