'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Video,
  Image,
  FileText,
  Bell,
  BarChart3,
  Settings,
  Shield,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

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
      { id: 'gallery', label: 'Gallery', href: '/dashboard/gallery', icon: Image },
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
  const { isCollapsed, toggle } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen z-50 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #0b1120 100%)' }}
    >
      {/* Gradient Border Right */}
      <div
        className="absolute right-0 top-0 h-full w-px"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(22,163,74,0.3), transparent)' }}
      />

      {/* Header / Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-vireon-accent-green/30 flex items-center justify-center flex-shrink-0 shadow-glow-green bg-[#030712]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vireon Safety Logo" className="w-full h-full object-cover" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-w-0"
            >
              <p className="font-heading text-sm font-bold text-vireon-text-primary leading-tight">
                Vireon Safety
              </p>
              <p className="text-xs text-vireon-text-muted truncate">Admin Console</p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggle}
          className="ml-auto w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center
                     text-vireon-text-muted hover:text-vireon-text-primary hover:bg-white/[0.08] transition-all duration-200 flex-shrink-0"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          id="sidebar-toggle-btn"
        >
          <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-bold uppercase tracking-widest text-vireon-text-muted px-3 mb-2"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      id={`nav-${item.id}`}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                        isActive
                          ? 'bg-vireon-accent-green/10 text-vireon-success border border-vireon-accent-green/20 shadow-glow-green'
                          : 'text-vireon-text-secondary hover:bg-white/[0.05] hover:text-vireon-text-primary'
                      )}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="active-nav"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-vireon-success rounded-full"
                          transition={{ duration: 0.2 }}
                        />
                      )}
                      <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-vireon-success' : '')} />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {item.badge && !isCollapsed && (
                        <span className="vireon-badge-green text-[10px] px-1.5 py-0.5">{item.badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="flex-shrink-0 p-3 border-t border-white/[0.06]">
        {user && (
          <div className={cn('flex items-center gap-3 p-2 rounded-xl', !isCollapsed && 'mb-2')}>
            <div className="w-8 h-8 rounded-lg bg-vireon-accent-green/10 border border-vireon-accent-green/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-vireon-success">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold text-vireon-text-primary truncate">{user.fullName}</p>
                  <p className="text-[10px] text-vireon-text-muted truncate">{user.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <button
          onClick={handleLogout}
          id="sidebar-logout-btn"
          title={isCollapsed ? 'Logout' : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-vireon-text-muted
                     hover:bg-red-500/10 hover:text-red-400 hover:border hover:border-red-500/20
                     transition-all duration-200 w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
