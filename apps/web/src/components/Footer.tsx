'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';

// App-shell and auth routes render their own chrome — no marketing footer there.
const HIDDEN_PREFIXES = [
  '/dashboard', '/history', '/compare', '/settings', '/repo-audit',
  '/admin', '/login', '/register', '/verify-email',
];

const FOOTER_LINKS = {
  Product: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Verify Audit', href: '/verify' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Move Security', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contact', href: '#' },
  ],
};

export function Footer() {
  const pathname = usePathname();
  const isHidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (isHidden) return null;

  return (
    <footer className="border-t border-zinc-900 bg-[#09090b]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-white text-sm">
                SuiAudit<span className="text-indigo-400"> AI</span>
              </span>
            </Link>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-xs">
              AI-powered security audits for Sui Move smart contracts.
              Findings stored permanently on the Walrus decentralized network.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-zinc-700">
            © {new Date().getFullYear()} SuiAudit AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors">Privacy</Link>
            <Link href="#" className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
