import React from 'react';

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8 text-center mb-8">
        <div className="h-10 w-64 bg-gray-800 rounded-lg mx-auto animate-pulse"></div>
        <div className="h-4 w-96 bg-gray-800 rounded-lg mx-auto animate-pulse"></div>
      </div>

      <div className="w-full max-w-2xl mx-auto p-6 rounded-xl border border-gray-800 bg-[#121212] shadow-xl text-gray-200">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <div className="h-6 w-40 bg-gray-800 rounded animate-pulse"></div>
            <div className="h-4 w-8 bg-gray-800 rounded animate-pulse"></div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div className="h-2.5 rounded-full bg-gray-700 w-1/4 animate-pulse"></div>
          </div>
          <div className="h-5 mt-3"></div>
        </div>

        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="mt-1">
                <div className="w-5 h-5 rounded-full bg-gray-800 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="h-5 w-48 bg-gray-800 rounded animate-pulse"></div>
                {i === 2 && <div className="h-3 w-64 bg-gray-800 rounded animate-pulse"></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

