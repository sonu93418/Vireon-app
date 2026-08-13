'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Search, LogOut, Menu, Trash2, CheckCheck, ExternalLink, Sun, Moon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/ui.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function TopNav() {
  const { user, logout } = useAuthStore();
  const { toggleMobile, isDarkMode, toggleDarkMode } = useSidebarStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { count: number } }>('/notifications/my/unread-count');
      return res.data.data.count;
    },
    refetchInterval: 15000,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'topnav-preview'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: NotificationItem[] }>('/notifications?limit=6');
      return res.data.data;
    },
    enabled: isOpen,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.patch('/notifications/my/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => apiClient.delete('/notifications/my/clear-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsOpen(false);
    },
  });

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all notification messages?')) {
      clearAllMutation.mutate();
    }
  };

  return (
    <header className="h-16 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-emerald-500/20 bg-white dark:bg-slate-900 dark:border-slate-800 flex-shrink-0 z-30 sticky top-0 shadow-xs transition-colors duration-200">
      {/* Mobile Menu Toggle + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={toggleMobile}
          id="mobile-sidebar-toggle"
          aria-label="Toggle navigation menu"
          className="flex md:hidden w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-slate-800 border border-emerald-500/20 dark:border-slate-700 items-center justify-center text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 transition-colors shadow-xs"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="topnav-search"
            type="text"
            placeholder="Search dashboard..."
            className="clay-input pl-10 py-2 text-sm w-full dark:bg-slate-800 dark:text-white dark:border-slate-700 shadow-inner"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* ── 3D Dark Mode / Light Mode Theme Toggle Button ── */}
        <button
          onClick={toggleDarkMode}
          id="topnav-theme-toggle-btn"
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-emerald-500/30 border-b-4 border-r-4 border-emerald-600/50 hover:border-emerald-500 text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs font-black shadow-xs active:border-b-2 active:border-r-2 active:translate-y-0.5 transition-all cursor-pointer"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            id="topnav-notifications-btn"
            className="relative w-9.5 h-9.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500/30 border-b-4 border-r-4 border-emerald-600/40 flex items-center justify-center
                       text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all duration-200 shadow-xs cursor-pointer active:border-b-2 active:border-r-2 active:translate-y-0.5"
            aria-label="Notifications"
            title="Open Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount && unreadCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-3.5 bg-emerald-50 border-b border-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-bold text-slate-900">Notifications</h3>
                  {unreadCount && unreadCount > 0 ? (
                    <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    title="Mark all as read"
                    className="p-1.5 text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-100/60 rounded-xl transition-colors flex items-center gap-1 font-semibold"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={clearAllMutation.isPending}
                    title="Clear all messages"
                    className="p-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear all</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notificationsData && notificationsData.length > 0 ? (
                  notificationsData.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/dashboard/notifications');
                      }}
                      className="p-3 hover:bg-emerald-50/50 transition-colors cursor-pointer flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-bold text-slate-900 truncate">{notif.title}</p>
                          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                            {formatDateTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{notif.body}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-semibold">No notification messages found</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1.5 hover:underline"
                >
                  <span>View All Notifications Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

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
