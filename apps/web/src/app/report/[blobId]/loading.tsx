import { SkeletonReportPage } from '@/components/SkeletonCard';

export default function ReportLoading() {
  return (
    <main className="min-h-screen bg-[#0d1117] py-12 px-4 sm:px-6 lg:px-8">
      <SkeletonReportPage />
    </main>
  );
}
