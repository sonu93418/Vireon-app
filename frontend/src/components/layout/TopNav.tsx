'use client';

import { Bell, Search, LogOut, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/ui.store';
import { useRouter } from 'next/navigation';

export function TopNav() {
  const { user, logout } = useAuthStore();
  const { toggleMobile } = useSidebarStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { count: number } }>('/notifications/my/unread-count');
      return res.data.data.count;
    },
    refetchInterval: 30000,
  });

  return (
    <header className="h-16 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-emerald-500/15 bg-white/85 backdrop-blur-md flex-shrink-0 z-30 sticky top-0">
      {/* Mobile Menu Toggle + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={toggleMobile}
          id="mobile-sidebar-toggle"
          aria-label="Toggle navigation menu"
          className="flex md:hidden w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-500/20 items-center justify-center text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="topnav-search"
            type="text"
            placeholder="Search dashboard..."
            className="clay-input pl-10 py-2 text-sm w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          id="topnav-notifications-btn"
          className="relative w-9 h-9 rounded-2xl bg-white border border-emerald-500/20 flex items-center justify-center
                     text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200 shadow-xs"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount && unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>

        {/* User Avatar & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-emerald-500/15">
            <div className="flex items-center gap-2">
              <div className="w-8.5 h-8.5 rounded-2xl bg-emerald-600 text-white border border-emerald-700 flex items-center justify-center text-xs font-black shadow-xs">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{user.fullName}</p>
                <p className="text-[10px] text-emerald-700 font-black uppercase tracking-wider">{user.role?.replace('_', ' ')}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              id="topnav-logout-btn"
              title="Logout"
              className="w-9 h-9 rounded-2xl bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center
                         hover:bg-red-600 hover:text-white transition-all duration-200 shadow-xs"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
