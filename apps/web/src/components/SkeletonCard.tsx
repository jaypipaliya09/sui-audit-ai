import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonAuditCard() {
  return (
    <div className="p-4 rounded-xl border border-[#21262d] bg-[#161b22] space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20 font-mono" />
      </div>
    </div>
  );
}

export function SkeletonReportHeader() {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 sm:p-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function SkeletonFindingCard() {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-5 w-5 rounded" />
      </div>
    </div>
  );
}

export function SkeletonReportPage() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pt-24 px-4">
      <SkeletonReportHeader />
      {/* Chips */}
      <div className="flex gap-3 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      {/* Summary */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      {/* Findings */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonFindingCard key={i} />
        ))}
      </div>
    </div>
  );
}
