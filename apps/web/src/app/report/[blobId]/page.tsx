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
    <main className="min-h-screen bg-obsidian text-ivory pt-24 pb-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Dynamic Background Effect */}
      <div aria-hidden className="absolute top-0 right-1/4 w-[600px] h-[400px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)' }} />
      <div aria-hidden className="absolute top-40 -left-20 w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(77,162,255,0.05), transparent 70%)' }} />

      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto mb-8 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-ivory transition-all group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </div>

      <div className="relative z-10">
        <ReportViewer audit={audit} />
      </div>
    </main>
  );
}
