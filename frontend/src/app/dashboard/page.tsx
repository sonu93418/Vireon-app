'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import {
  Users, GraduationCap, BookOpen, Video, FileText,
  TrendingUp, TrendingDown, Activity, Calendar,
  MessageSquare, BarChart3, Zap, Shield, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface DashboardData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    totalTeachers: number;
    totalCourses: number;
    totalClasses: number;
    scheduledClasses: number;
    totalBlogs: number;
    publishedBlogs: number;
    newContactsThisMonth: number;
    classesThisMonth: number;
  };
  charts: {
    usersByRole: Array<{ _id: string; count: number }>;
    monthlyGrowth: Array<{ _id: { year: number; month: number }; count: number }>;
  };
}

const DEFAULT_DASHBOARD: DashboardData = {
  stats: {
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalClasses: 0,
    scheduledClasses: 0,
    totalBlogs: 0,
    publishedBlogs: 0,
    newContactsThisMonth: 0,
    classesThisMonth: 0,
  },
  charts: {
    usersByRole: [
      { _id: 'STUDENT', count: 0 },
      { _id: 'SUPER_ADMIN', count: 1 },
    ],
    monthlyGrowth: [],
  },
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROLE_COLORS = { STUDENT: '#16A34A', FACULTY: '#3B82F6', ADMIN: '#F59E0B', SUPER_ADMIN: '#EF4444' };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

function StatCard({ label, value, change, icon: Icon, accent = false, id }: {
  label: string; value: string | number; change?: { value: string; positive: boolean };
  icon: React.ElementType; accent?: boolean; id: string;
}) {
  return (
    <motion.div variants={itemVariants} id={id} className="bento-card hover:border-emerald-500/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'w-10 h-10 rounded-2xl flex items-center justify-center transition-colors',
          accent ? 'bg-emerald-600/10 border border-emerald-500/30 text-emerald-600' : 'bg-slate-100 border border-slate-200 text-slate-600'
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <div className={cn(
            'flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
            change.positive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          )}>
            {change.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-black font-heading text-slate-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs font-semibold text-slate-500 mt-1">{label}</div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: DashboardData }>('/dashboard/overview');
      return res.data.data;
    },
    refetchInterval: (query) => {
      const status = (query.state.error as any)?.response?.status;
      if (status === 401 || status === 403) return false;
      return 30000;
    },
    retry: (failureCount, error) => {
      const status = (error as any)?.response?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: true,
  });

  const activeData = data ?? DEFAULT_DASHBOARD;
  const stats = activeData.stats ?? DEFAULT_DASHBOARD.stats;
  const charts = activeData.charts ?? DEFAULT_DASHBOARD.charts;

  const rawGrowth = charts.monthlyGrowth || [];
  const monthlyGrowthData = rawGrowth.length > 0
    ? rawGrowth.map((d) => ({
        month: MONTH_NAMES[(d._id?.month || 1) - 1] ?? 'Jan',
        users: d.count || 0,
      }))
    : [
        { month: 'Current', users: stats.totalUsers },
      ];

  const rawRoles = charts.usersByRole || [];
  const pieData = rawRoles.length > 0
    ? rawRoles.map((r) => ({
        name: r._id || 'UNKNOWN',
        value: r.count || 0,
        color: ROLE_COLORS[r._id as keyof typeof ROLE_COLORS] ?? '#64748B',
      }))
    : [
        { name: 'SUPER_ADMIN', value: stats.totalUsers || 1, color: '#EF4444' },
      ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-black text-slate-900">
            Dashboard Overview
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Vireon Safety Institute — Live Real-Time Analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-500/20 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all shadow-xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-emerald-600', isFetching && 'animate-spin')} />
            Refresh
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-500/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="text-xs text-emerald-800 font-extrabold uppercase tracking-wider">Live</span>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Stat Cards Row 1 */}
        <StatCard id="stat-total-users" label="Total Users" value={stats.totalUsers} icon={Users} accent
          change={{ value: `+${stats.newUsersThisMonth} this month`, positive: true }} />
        <StatCard id="stat-active-users" label="Active Users" value={stats.activeUsers} icon={Activity}
          change={{ value: `${Math.round((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100)}% active`, positive: true }} />
        <StatCard id="stat-teachers" label="Expert Trainers" value={stats.totalTeachers} icon={GraduationCap} />
        <StatCard id="stat-courses" label="Active Courses" value={stats.totalCourses} icon={BookOpen} />

        {/* Monthly Growth Chart — Wide Card */}
        <motion.div variants={itemVariants} id="chart-growth" className="bento-card col-span-1 sm:col-span-2 lg:col-span-3 row-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 font-heading">User Growth Trends</h2>
              <p className="text-xs font-semibold text-slate-500">Real-time registration metrics</p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" /> Real-time
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.12)" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', color: '#0F172A', fontSize: '13px', boxShadow: '0 4px 14px rgba(16,185,129,0.15)' }}
                cursor={{ stroke: 'rgba(16,185,129,0.3)' }}
              />
              <Area type="monotone" dataKey="users" stroke="#16A34A" strokeWidth={2.5} fill="url(#userGradient)" dot={{ fill: '#16A34A', r: 4 }} activeDot={{ r: 6, fill: '#15803D' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Distribution Pie — Tall Card */}
        <motion.div variants={itemVariants} id="chart-role-distribution" className="bento-card col-span-1 row-span-2">
          <h2 className="text-base font-black text-slate-900 font-heading mb-0.5">User Roles</h2>
          <p className="text-xs font-semibold text-slate-500 mb-3">Live distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', color: '#0F172A', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-600 uppercase text-[11px] tracking-wider">{d.name.replace('_', ' ')}</span>
                </div>
                <span className="text-slate-900 font-extrabold">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stat Cards Row 2 */}
        <StatCard id="stat-classes" label="Scheduled Classes" value={stats.scheduledClasses} icon={Calendar} accent
          change={{ value: `${stats.classesThisMonth} this month`, positive: true }} />
        <StatCard id="stat-blogs" label="Published Blogs" value={stats.publishedBlogs} icon={FileText} />
        <StatCard id="stat-contacts" label="New Inquiries" value={stats.newContactsThisMonth} icon={MessageSquare}
          change={{ value: 'this month', positive: true }} />

        {/* Institute Info Card — Wide */}
        <motion.div variants={itemVariants} id="card-institute-info" className="bento-card col-span-1 sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-600">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-base font-black text-slate-900">Vireon Safety Institute</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Govt of India & ISO 45001 Accredited Institute</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">ISO 45001</span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">ISO 9001</span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">NSDM Certified</span>
            </div>
          </div>
          <div className="text-left sm:text-right flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="text-2xl font-heading font-black text-emerald-600">100%</div>
            <div className="text-xs font-bold text-slate-500">Placement Support</div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} id="card-quick-actions" className="bento-card col-span-1 sm:col-span-2">
          <h2 className="text-base font-black text-slate-900 font-heading mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Users List', icon: Users, href: '/dashboard/users' },
              { label: 'Schedule Class', icon: Calendar, href: '/dashboard/classes' },
              { label: 'Add Course', icon: BookOpen, href: '/dashboard/courses' },
              { label: 'Send Notification', icon: Zap, href: '/dashboard/notifications' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                id={`quick-action-${action.label.toLowerCase().replace(/\s/g, '-')}`}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 transition-all text-xs font-bold"
              >
                <action.icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="truncate">{action.label}</span>
              </a>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
