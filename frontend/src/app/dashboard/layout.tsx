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
      <div className="flex h-screen w-screen items-center justify-center bg-[#030712] text-[#F1F5F9]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-center text-[#22C55E] animate-pulse">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-xs text-[#94A3B8] font-semibold">Loading Vireon Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#030712] text-[#F1F5F9]">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 bg-[#030712]',
          isCollapsed ? 'ml-[72px]' : 'ml-[280px]'
        )}
      >
        <TopNav />
        <main className="flex-1 overflow-auto p-6 bg-[#030712] text-[#F1F5F9]">
          {children}
        </main>
      </div>
    </div>
  );
}
