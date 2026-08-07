'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { Shield } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebarStore();
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && (!isAuthenticated || !user)) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F4FAF6] text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 animate-pulse shadow-glow-green">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500 font-semibold">Loading Vireon Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4FAF6] text-slate-800 flex flex-col">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out bg-[#F4FAF6]',
          // Desktop margins: md:ml-20 (collapsed) vs md:ml-68 (expanded), Mobile: ml-0 (no overlap)
          isCollapsed ? 'md:ml-20' : 'md:ml-68',
          'ml-0'
        )}
      >
        <TopNav />
        <main className="flex-1 p-4 md:p-6 bg-[#F4FAF6] text-slate-800 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
