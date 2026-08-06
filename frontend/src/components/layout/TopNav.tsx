'use client';

import { Bell, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';

export function TopNav() {
  const { user } = useAuthStore();

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { count: number } }>('/notifications/my/unread-count');
      return res.data.data.count;
    },
    refetchInterval: 30000, // refetch every 30s
  });

  return (
    <header className="h-16 flex items-center gap-4 px-6 border-b border-white/[0.06] bg-vireon-primary/60 backdrop-blur-md flex-shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vireon-text-muted" />
        <input
          id="topnav-search"
          type="text"
          placeholder="Search anything..."
          className="vireon-input pl-9 py-2 text-sm"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Notifications */}
        <button
          id="topnav-notifications-btn"
          className="relative w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center
                     text-vireon-text-muted hover:text-vireon-text-primary hover:bg-white/[0.1] transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount && unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-vireon-accent-green text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>

        {/* User Avatar */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.06]">
            <div className="w-8 h-8 rounded-xl bg-vireon-accent-green/10 border border-vireon-accent-green/20 flex items-center justify-center text-xs font-bold text-vireon-success">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-vireon-text-primary leading-tight">{user.fullName}</p>
              <p className="text-[10px] text-vireon-text-muted capitalize">{user.role.replace('_', ' ').toLowerCase()}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
