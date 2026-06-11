import React from 'react';
import { Skeleton } from '@/components/SkeletonCard';

export default function HowItWorksLoading() {
  return (
    <main className="min-h-screen bg-[#0d1117] pt-24 pb-20">
      {/* Header skeleton */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <Skeleton className="h-7 w-48 mx-auto rounded-full" />
          <Skeleton className="h-12 w-80 mx-auto" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
      </section>

      {/* Steps skeleton */}
      <section className="max-w-5xl mx-auto px-4 py-16 space-y-20">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-start`}>
            <div className="flex-1 space-y-5">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <div className="space-y-3 pt-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full">
              <Skeleton className="w-full h-52 rounded-2xl" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
