import React from 'react';
import Link from 'next/link';
import { Shield, ExternalLink } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#21262d] bg-[#0d1117] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                Sui<span className="gradient-text">Audit</span> AI
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              AI-powered smart contract security for the Sui Move ecosystem. Reports stored permanently on the Walrus decentralized network.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#audit" className="text-sm text-gray-500 hover:text-gray-200 transition-colors">
                  Run an Audit
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm text-gray-500 hover:text-gray-200 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-gray-500 hover:text-gray-200 transition-colors">
                  Recent Audits
                </Link>
              </li>
            </ul>
          </div>

          {/* External Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Built With</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://sui.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-200 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Sui Network
                </a>
              </li>
              <li>
                <a
                  href="https://walrus.space"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-200 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Walrus Network
                </a>
              </li>
              <li>
                <a
                  href="https://www.anthropic.com/claude"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-200 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Claude Sonnet 4
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#21262d] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {year} SuiAudit AI. Built for Sui Overflow 2026.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Reports stored on</span>
            <a
              href="https://walrus.space"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 transition-colors font-medium"
            >
              Walrus Network ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
