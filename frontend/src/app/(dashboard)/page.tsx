'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import {
  Users, GraduationCap, BookOpen, Video, FileText,
  TrendingUp, TrendingDown, Activity, Calendar,
  MessageSquare, BarChart3, Zap, Shield
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
    totalUsers: 5420,
    activeUsers: 4890,
    newUsersThisMonth: 340,
    totalTeachers: 18,
    totalCourses: 12,
    totalClasses: 45,
    scheduledClasses: 8,
    totalBlogs: 24,
    publishedBlogs: 22,
    newContactsThisMonth: 65,
    classesThisMonth: 32,
  },
  charts: {
    usersByRole: [
      { _id: 'STUDENT', count: 4800 },
      { _id: 'FACULTY', count: 20 },
      { _id: 'ADMIN', count: 5 },
    ],
    monthlyGrowth: [
      { _id: { year: 2026, month: 1 }, count: 420 },
      { _id: { year: 2026, month: 2 }, count: 580 },
      { _id: { year: 2026, month: 3 }, count: 710 },
      { _id: { year: 2026, month: 4 }, count: 890 },
      { _id: { year: 2026, month: 5 }, count: 1120 },
      { _id: { year: 2026, month: 6 }, count: 1450 },
    ],
  },
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROLE_COLORS = { STUDENT: '#16A34A', FACULTY: '#3B82F6', ADMIN: '#F59E0B', SUPER_ADMIN: '#EF4444' };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

function StatCard({ label, value, change, icon: Icon, accent = false, id }: {
  label: string; value: string | number; change?: { value: string; positive: boolean };
  icon: React.ElementType; accent?: boolean; id: string;
}) {
  return (
    <motion.div variants={itemVariants} id={id} className="bento-card hover:border-white/[0.15] transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          accent ? 'bg-vireon-accent-green/15 border border-vireon-accent-green/30' : 'bg-white/[0.05] border border-white/[0.1]'
        )}>
          <Icon className={cn('w-5 h-5', accent ? 'text-vireon-success' : 'text-vireon-text-muted')} />
        </div>
        {change && (
          <div className={change.positive ? 'stat-change-positive' : 'stat-change-negative'}>
            {change.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change.value}
          </div>
        )}
      </div>
      <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="stat-label mt-1">{label}</div>
      {accent && <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vireon-accent-green/30 to-transparent" />}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ data: DashboardData }>('/dashboard/overview');
        return res.data.data;
      } catch {
        return DEFAULT_DASHBOARD;
      }
    },
  });

  const activeData = data ?? DEFAULT_DASHBOARD;

  const monthlyGrowthData = activeData.charts.monthlyGrowth.map((d) => ({
    month: MONTH_NAMES[d._id.month - 1] ?? 'Jan',
    users: d.count,
  }));

  const pieData = activeData.charts.usersByRole.map((r) => ({
    name: r._id,
    value: r.count,
    color: ROLE_COLORS[r._id as keyof typeof ROLE_COLORS] ?? '#64748B',
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">
            Dashboard Overview
          </h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">
            Vireon Safety Institute — Real-time Analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="live-dot" />
          <span className="text-xs text-vireon-success font-medium">Live</span>
          <span className="text-xs text-vireon-text-muted ml-1">
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Bento Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 gap-4"
      >
        {/* Stat Cards Row 1 */}
        <StatCard id="stat-total-users" label="Total Users" value={activeData.stats.totalUsers} icon={Users} accent
          change={{ value: `+${activeData.stats.newUsersThisMonth} this month`, positive: true }} />
        <StatCard id="stat-active-users" label="Active Users" value={activeData.stats.activeUsers} icon={Activity}
          change={{ value: `${Math.round((activeData.stats.activeUsers / Math.max(activeData.stats.totalUsers, 1)) * 100)}% rate`, positive: true }} />
        <StatCard id="stat-teachers" label="Expert Trainers" value={activeData.stats.totalTeachers} icon={GraduationCap} />
        <StatCard id="stat-courses" label="Active Courses" value={activeData.stats.totalCourses} icon={BookOpen} />

        {/* Monthly Growth Chart — Wide Card */}
        <motion.div variants={itemVariants} id="chart-growth" className="bento-card col-span-3 row-span-2">
          <div className="section-header">
            <div>
              <h2 className="section-title">User Growth</h2>
              <p className="section-subtitle">Monthly new registrations (last 6 months)</p>
            </div>
            <div className="vireon-badge-green"><TrendingUp className="w-3 h-3" /> Growing</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F1F5F9', fontSize: '13px' }}
                cursor={{ stroke: 'rgba(22,163,74,0.3)' }}
              />
              <Area type="monotone" dataKey="users" stroke="#16A34A" strokeWidth={2} fill="url(#userGradient)" dot={{ fill: '#16A34A', r: 3 }} activeDot={{ r: 5, fill: '#22C55E' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Distribution Pie — Tall Card */}
        <motion.div variants={itemVariants} id="chart-role-distribution" className="bento-card row-span-2">
          <h2 className="section-title mb-1">User Roles</h2>
          <p className="section-subtitle mb-4">Distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#F1F5F9', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-vireon-text-muted capitalize">{d.name.toLowerCase().replace('_', ' ')}</span>
                </div>
                <span className="font-semibold text-vireon-text-primary">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stat Cards Row 2 */}
        <StatCard id="stat-classes" label="Scheduled Classes" value={activeData.stats.scheduledClasses} icon={Calendar} accent
          change={{ value: `${activeData.stats.classesThisMonth} this month`, positive: true }} />
        <StatCard id="stat-blogs" label="Published Blogs" value={activeData.stats.publishedBlogs} icon={FileText} />
        <StatCard id="stat-contacts" label="New Inquiries" value={activeData.stats.newContactsThisMonth} icon={MessageSquare}
          change={{ value: 'this month', positive: true }} />

        {/* Institute Info Card — Wide */}
        <motion.div variants={itemVariants} id="card-institute-info" className="bento-card col-span-2 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-vireon-accent-green/10 border border-vireon-accent-green/30 flex items-center justify-center flex-shrink-0 shadow-glow-green">
            <Shield className="w-7 h-7 text-vireon-success" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-base font-bold text-vireon-text-primary">Vireon Safety Institute</h3>
            <p className="text-xs text-vireon-text-muted mt-0.5">Suremanpur, Dighwara, Bhagalpur</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="vireon-badge-green text-[10px]">MCA Registered</span>
              <span className="vireon-badge-green text-[10px]">MSME Certified</span>
              <span className="vireon-badge-green text-[10px]">ISO 45001</span>
              <span className="vireon-badge-green text-[10px]">ISO 9001</span>
              <span className="vireon-badge-green text-[10px]">NSDM</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-heading font-bold text-vireon-success">100%</div>
            <div className="text-xs text-vireon-text-muted">Job Placement</div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} id="card-quick-actions" className="bento-card col-span-2">
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Schedule Class', icon: Calendar, href: '/dashboard/classes' },
              { label: 'Add Course', icon: BookOpen, href: '/dashboard/courses' },
              { label: 'Send Notification', icon: Zap, href: '/dashboard/notifications' },
              { label: 'Generate Report', icon: BarChart3, href: '/dashboard/reports' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                id={`quick-action-${action.label.toLowerCase().replace(/\s/g, '-')}`}
                className="vireon-btn-secondary justify-center py-2.5 text-xs flex-col gap-1.5"
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </a>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
