import { Skeleton } from '@/components/SkeletonCard';

export default function AuditProgressLoading() {
  return (
    <main className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-4 pt-24">
      {/* Header skeleton */}
      <div className="w-full max-w-3xl space-y-4 text-center mb-10">
        <Skeleton className="h-10 w-72 mx-auto" />
        <Skeleton className="h-5 w-[480px] max-w-full mx-auto" />
      </div>

      {/* Progress card skeleton */}
      <div className="w-full max-w-2xl mx-auto p-6 rounded-2xl border border-[#21262d] bg-[#161b22] shadow-xl">
        {/* Progress bar header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="w-full bg-[#21262d] rounded-full h-2.5 overflow-hidden">
            <div className="h-2.5 rounded-full skeleton w-1/5" />
          </div>
          <Skeleton className="h-4 w-64 mt-3" />
        </div>

        {/* Steps skeleton */}
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex items-start gap-4 ${i > 1 ? 'opacity-40' : ''}`}>
              <div className="mt-1">
                <Skeleton className="w-5 h-5 rounded-full" />
              </div>
              <div className="space-y-2 flex-1">
                <Skeleton className={`h-5 ${i === 0 ? 'w-24' : i === 1 ? 'w-56' : i === 2 ? 'w-48' : i === 3 ? 'w-52' : 'w-40'}`} />
                {i === 1 && <Skeleton className="h-3 w-36" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
