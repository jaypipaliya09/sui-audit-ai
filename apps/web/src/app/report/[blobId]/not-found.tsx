import Link from 'next/link';
import { ShieldOff, ArrowLeft, RotateCcw } from 'lucide-react';

export default function ReportNotFound() {
  return (
    <main className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <ShieldOff className="w-10 h-10 text-red-400" />
        </div>

        {/* Text */}
        <div>
          <h1 className="text-3xl font-black text-white mb-3">Report Not Found</h1>
          <p className="text-gray-500 leading-relaxed">
            This report doesn&apos;t exist or the blob ID is incorrect. It may have expired or the URL is malformed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-[#30363d] hover:border-[#444c56] text-gray-300 hover:text-white rounded-xl transition-all font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/#audit"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-semibold text-sm shadow-lg shadow-blue-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            Run New Audit
          </Link>
        </div>
      </div>
    </main>
  );
}
