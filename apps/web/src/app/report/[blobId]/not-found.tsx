import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#121212] border border-gray-800 rounded-xl p-8 text-center shadow-xl space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white">Report Not Found</h1>
        
        <p className="text-gray-400">
          We couldn't find an audit report matching this ID. It may have expired, or the ID might be incorrect.
        </p>

        <Link 
          href="/"
          className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors mt-4"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
