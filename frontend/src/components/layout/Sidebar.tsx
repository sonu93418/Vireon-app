'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Video,
  Image as ImageIcon,
  FileText,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
  LogOut,
  X,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Management',
    items: [
      { id: 'users', label: 'Users', href: '/dashboard/users', icon: Users },
      { id: 'teachers', label: 'Teachers', href: '/dashboard/teachers', icon: GraduationCap },
      { id: 'courses', label: 'Courses', href: '/dashboard/courses', icon: BookOpen },
      { id: 'classes', label: 'Online Classes', href: '/dashboard/classes', icon: Video },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'blogs', label: 'Blogs', href: '/dashboard/blogs', icon: FileText },
      { id: 'gallery', label: 'Gallery', href: '/dashboard/gallery', icon: ImageIcon },
      { id: 'cms', label: 'CMS Pages', href: '/dashboard/cms', icon: FileText },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'notifications', label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
      { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggle, isMobileOpen, setMobileOpen } = useSidebarStore();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    router.push('/login');
  };

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── Mobile Backdrop Overlay ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Main Sidebar Drawer / Panel ── */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen z-50 flex flex-col bg-white border-r border-emerald-500/15 shadow-xl transition-all duration-300 ease-in-out',
          // Mobile responsive drawer positioning
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0',
          // Desktop collapsed vs expanded width
          !isMobileOpen && (isCollapsed ? 'md:w-20' : 'md:w-68')
        )}
      >
        {/* Decorative subtle border gradient */}
        <div
          className="absolute right-0 top-0 h-full w-px pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(16,185,129,0.25), transparent)' }}
        />

        {/* ── Header / Logo Section ── */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-emerald-500/10 flex-shrink-0 bg-emerald-50/40">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={handleNavClick}>
            <div className="w-10 h-10 rounded-2xl bg-white border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Vireon Safety Logo" className="w-full h-full object-contain" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-heading text-sm font-black text-slate-900 leading-none truncate">
                  Vireon Safety
                </span>
                <span className="text-[11px] text-emerald-700 font-extrabold tracking-wider uppercase mt-1 truncate">
                  Admin Console
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggle}
            id="sidebar-toggle-btn"
            className="hidden md:flex w-7 h-7 rounded-xl bg-white border border-emerald-500/20 items-center justify-center
                       text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200 shadow-sm flex-shrink-0"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform duration-300', isCollapsed && 'rotate-180')} />
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex md:hidden w-8 h-8 rounded-xl bg-white border border-slate-200 items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation Items ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {(!isCollapsed || isMobileOpen) && (
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const showFullLabel = !isCollapsed || isMobileOpen;

                  return (
                    <li key={item.id} className="relative group">
                      <Link
                        href={item.href}
                        id={`nav-${item.id}`}
                        onClick={handleNavClick}
                        className={cn(
                          'flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 relative',
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-bold'
                            : 'text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-800'
                        )}
                      >
                        <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600')} />

                        {showFullLabel && (
                          <span className="truncate flex-1">{item.label}</span>
                        )}

                        {item.badge && showFullLabel && (
                          <span className="ml-auto bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>

                      {/* Desktop Hover Floating Tooltip when Collapsed */}
                      {isCollapsed && !isMobileOpen && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap">
                          {item.label}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 border-4 border-transparent border-r-slate-900" />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Footer / User Profile & Logout ── */}
        <div className="flex-shrink-0 p-3 border-t border-emerald-500/10 bg-emerald-50/30 space-y-2">
          {user && (
            <div className={cn('flex items-center gap-3 p-2 rounded-2xl bg-white border border-emerald-500/15 shadow-xs', isCollapsed && !isMobileOpen && 'justify-center')}>
              <div className="w-8.5 h-8.5 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-black shadow-xs">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate leading-tight">{user.fullName}</p>
                  <p className="text-[10px] text-emerald-700 font-bold tracking-wide uppercase truncate mt-0.5">
                    {user.role}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleLogout}
            id="sidebar-logout-btn"
            title={isCollapsed && !isMobileOpen ? 'Logout' : undefined}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-slate-500',
              'hover:bg-red-50 hover:text-red-600 hover:border hover:border-red-200/60 transition-all duration-200 w-full',
              isCollapsed && !isMobileOpen && 'justify-center px-0'
            )}
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            {(!isCollapsed || isMobileOpen) && (
              <span className="font-semibold">Logout</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
