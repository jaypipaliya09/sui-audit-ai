'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Clock,
  LogOut, ChevronRight, Loader2, Settings, PanelLeftClose, PanelLeft,
} from 'lucide-react';
import { LogoMark } from '@/components/LogoMark';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'Audit History', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-jade-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Find current page title
  const currentNav = NAV_ITEMS.find((item) =>
    item.href !== '/' && pathname.startsWith(item.href)
  );
  const pageTitle = currentNav?.label || (pathname.includes('/compare') ? 'Compare Audits' : 'Dashboard');

  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-56'
        } border-r border-zinc-900 bg-[#0c0c0e] flex flex-col fixed inset-y-0 left-0 z-40 transition-all duration-200`}
      >
        {/* Logo */}
        <div className={`h-14 flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-4'} border-b border-zinc-900`}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-jade-500 to-champagne-500 flex items-center justify-center shrink-0 shadow-md shadow-black/40">
            <LogoMark className="w-[17px] h-[17px] text-[#04140d]" strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <span className="font-semibold text-ivory text-sm tracking-tight">
              SuiAudit<span className="lux-gradient"> AI</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-3 ${collapsed ? 'px-2' : 'px-2'} space-y-0.5`}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.href !== '/' && (
              pathname === item.href || pathname.startsWith(item.href)
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 ${collapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-md text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-jade-500/8 text-jade-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && isActive && <ChevronRight className="w-3 h-3 ml-auto text-jade-500/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`mx-2 mb-2 p-2 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03] transition-colors ${collapsed ? 'self-center' : ''}`}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* User */}
        <div className={`${collapsed ? 'px-2' : 'px-3'} py-3 border-t border-zinc-900`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-jade-600/15 border border-jade-500/20 flex items-center justify-center text-jade-400 text-xs font-semibold shrink-0">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-[11px] text-zinc-600 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className={`flex-1 ${collapsed ? 'ml-16' : 'ml-56'} transition-all duration-200`}>
        {/* Top bar */}
        <header className="h-14 border-b border-zinc-900 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
          <h1 className="text-sm font-medium text-zinc-300">{pageTitle}</h1>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-md bg-jade-500/8 border border-jade-500/15 text-jade-400 text-[11px] font-medium">
              {user?.plan || 'FREE'}
            </span>
            <div className="w-7 h-7 rounded-full bg-jade-600/15 border border-jade-500/20 flex items-center justify-center text-jade-400 text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="p-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
