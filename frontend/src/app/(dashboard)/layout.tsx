'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/ui.store';
import { Shield } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebarStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-vireon-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-vireon-accent-green/10 border border-vireon-accent-green/30 flex items-center justify-center text-vireon-success animate-pulse">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-xs text-vireon-text-muted font-heading font-semibold">Loading Vireon Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-vireon-bg">
      <Sidebar />
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          isCollapsed ? 'ml-[72px]' : 'ml-[280px]'
        )}
      >
        <TopNav />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
