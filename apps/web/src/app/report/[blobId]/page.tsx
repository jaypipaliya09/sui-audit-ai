import { ReportViewer } from '@/components/ReportViewer';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// Fetch the audit report by blobId on the server
async function getAuditReport(blobId: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  try {
    const res = await fetch(`${API_URL}/reports/blob/${blobId}`, {
      cache: 'no-store', // Always fetch latest for now
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

export default async function ReportPage({ params }: { params: { blobId: string } }) {
  const audit = await getAuditReport(params.blobId);

  if (!audit) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
        <Link 
          href="/"
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          ← Back to Home
        </Link>
      </div>

      <ReportViewer audit={audit} />
    </main>
  );
}
