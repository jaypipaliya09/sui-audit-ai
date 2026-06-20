'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  LayoutDashboard, Users, Shield, LogOut, ChevronRight, Loader2,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/dashboard/users', label: 'Users', icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/admin/login');
    } else if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden">
        <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] bg-emerald-500/10 pointer-events-none" />
        <Loader2 className="relative z-10 w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const activeItem = NAV_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="min-h-screen bg-obsidian flex relative overflow-hidden">
      {/* Background Ambience */}
      <div aria-hidden className="absolute top-0 right-1/4 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%)' }} />
      <div aria-hidden className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(77,162,255,0.03), transparent 70%)' }} />

      {/* Sidebar */}
      <aside className="w-60 glass-panel !rounded-none border-t-0 border-b-0 border-l-0 border-r border-white/[0.04] bg-[#08080a]/80 backdrop-blur-3xl flex flex-col fixed inset-y-0 left-0 z-40">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.04]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-medium text-ivory text-sm tracking-wide">SuiAudit Admin</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeItem?.href === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]' 
                    : 'text-zinc-500 hover:text-ivory hover:bg-white/[0.03] border border-transparent hover:border-white/[0.02]'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-emerald-500/70'}`} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-500/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-ivory truncate">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-zinc-500 font-mono truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-300 group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 relative z-10">
        <header className="h-16 border-b border-white/[0.04] bg-[#0a0a0c]/80 backdrop-blur-xl flex items-center px-8 sticky top-0 z-30">
          <h1 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">{activeItem?.label || 'Admin'}</h1>
        </header>
        <div className="p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
