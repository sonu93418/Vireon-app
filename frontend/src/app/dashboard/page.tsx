'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import axios from 'axios';
import {
  Users, GraduationCap, BookOpen, Video, FileText,
  TrendingUp, TrendingDown, Activity, Calendar,
  MessageSquare, BarChart3, Zap, Shield, RefreshCw,
  Building2, MapPin, CheckCircle2, Award, Sparkles, Briefcase
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

const PLACED_CANDIDATES = [
  {
    id: 'p-ravindra',
    name: 'Ravindra Prasad',
    salary: '₹30,000/month',
    company: 'Staffing Pvt. Ltd',
    location: 'Andhra Pradesh',
    role: 'Lead Safety Officer',
    image: '/placements/ravindra_prasad.jpg',
    badge: '⭐ Highest Package',
  },
  {
    id: 'p-ankit',
    name: 'Ankit Kr Yadav',
    salary: '₹18,000/month',
    company: 'Solar Plant',
    location: 'Maharashtra',
    role: 'Solar EHS Supervisor',
    image: '/placements/ankit_kr_yadav.jpg',
    badge: 'Clean Energy',
  },
  {
    id: 'p-vickey',
    name: 'Vickey Kr Verma',
    salary: '₹16,000/month',
    company: 'Green stone Pvt. Ltd',
    location: 'Bangalore',
    role: 'Site Safety Inspector',
    image: '/placements/vickey_kr_verma.jpg',
    badge: 'MNC Site',
  },
  {
    id: 'p-suraj',
    name: 'Suraj kr Pandit',
    salary: '₹18,000/month',
    company: 'Solar Plant',
    location: 'Maharashtra',
    role: 'EHS Field Officer',
    image: '/placements/suraj_kr_pandit.jpg',
    badge: 'Renewable',
  },
  {
    id: 'p-suman',
    name: 'Suman Kumar',
    salary: '₹23,000/month',
    company: 'Tata Power',
    location: 'Kalyan',
    role: 'Power Plant Safety Officer',
    image: '/placements/suman_kumar.jpg',
    badge: '🏆 Tata Group',
  },
  {
    id: 'p-rakesh',
    name: 'Rakesh Rajak',
    salary: '₹20,000/month',
    company: 'EPI Gral',
    location: 'Gujarat',
    role: 'Industrial EHS Executive',
    image: '/placements/rakesh_rajak.jpg',
    badge: 'Heavy Industry',
  },
  {
    id: 'p-kaushal',
    name: 'Kaushal kr Yadav',
    salary: '₹24,000/month',
    company: 'Tata Motors',
    location: 'Ahemdabad',
    role: 'Automobile Safety Officer',
    image: '/placements/kaushal_kr_yadav.jpg',
    badge: '🏆 Tata Motors',
  },
  {
    id: 'p-arjun',
    name: 'Arjun Singh',
    salary: '₹20,000/month',
    company: 'Kirby Pvt. Ltd',
    location: 'Gujarat',
    role: 'PEB Safety Specialist',
    image: '/placements/arjun_singh.jpg',
    badge: 'Engineering',
  },
  {
    id: 'p-anwar',
    name: 'Anwar Ali',
    salary: '₹18,000/month',
    company: 'Torrent Pvt. Ltd',
    location: 'Muradabad',
    role: 'Process Safety Officer',
    image: '/placements/anwar_ali.jpg',
    badge: 'Power & Utility',
  },
  {
    id: 'p-vicky',
    name: 'Vicky Kr Yadav',
    salary: '₹24,000/month',
    company: 'Ravi Construction',
    location: 'Surat',
    role: 'Construction Safety Officer',
    image: '/placements/vicky_kr_yadav.jpg',
    badge: 'Infrastructure',
  },
];

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
    <motion.div
      variants={itemVariants}
      id={id}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ y: 1 }}
      className="bento-card border-2 border-emerald-500/30 border-b-4 border-r-4 border-emerald-600/50 hover:border-emerald-500 shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_2px_3px_rgba(255,255,255,1)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'w-10 h-10 rounded-2xl flex items-center justify-center transition-all border-b-2 border-r-2 shadow-inner',
          accent
            ? 'bg-emerald-600 text-white border-emerald-800 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-inner'
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <div className={cn(
            'flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-xl shadow-xs border-b-2',
            change.positive ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' : 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
          )}>
            {change.positive ? <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
            {change.value}
          </div>
        )}
      </div>
      <div className="text-2xl font-black font-heading text-slate-900 dark:text-white tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300 mt-1 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isFetching, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard', 'overview'],
    queryFn: async (): Promise<DashboardData> => {
      try {
        const res = await apiClient.get<{ data: DashboardData }>('/dashboard/overview');
        if (res.data?.data) return res.data.data;
      } catch {
        // Fallback try direct localhost
      }
      try {
        const fallbackRes = await axios.get('http://localhost:5000/api/v1/dashboard/overview');
        return fallbackRes.data.data;
      } catch {
        return DEFAULT_DASHBOARD;
      }
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
    ? rawGrowth.map((d: any) => ({
        month: d.month || 'Jan',
        users: d.totalUsers ?? d.count ?? 0,
        newUsers: d.newUsers ?? 0,
      }))
    : [
        { month: 'Current', users: stats.totalUsers, newUsers: stats.newUsersThisMonth },
      ];

  const rawRoles = charts.usersByRole || [];
  const pieData = rawRoles.length > 0
    ? rawRoles.map((r) => ({
        name: r._id || 'UNKNOWN',
        value: r.count || 0,
        color: ROLE_COLORS[r._id as keyof typeof ROLE_COLORS] ?? '#64748B',
      }))
    : [
        { name: 'STUDENT', value: Math.max(stats.totalUsers - 1, 1), color: '#16A34A' },
        { name: 'SUPER_ADMIN', value: 1, color: '#EF4444' },
      ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-black text-slate-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-xs font-extrabold text-slate-600 dark:text-slate-300 mt-0.5">
            Vireon Safety Institute — Live Real-Time Analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-500/30 border-b-4 border-r-4 border-emerald-600/40 text-xs font-black text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-700 hover:text-emerald-800 transition-all shadow-xs active:border-b-2 active:border-r-2 active:translate-y-0.5 cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400', isFetching && 'animate-spin')} />
            Refresh
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-500/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-extrabold uppercase tracking-wider">Live</span>
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
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlyGrowthData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.15)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', color: '#0F172A', fontSize: '13px', fontWeight: 600, boxShadow: '0 6px 20px rgba(16,185,129,0.15)' }}
                cursor={{ stroke: 'rgba(16,185,129,0.4)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#16A34A"
                strokeWidth={3}
                fill="url(#userGradient)"
                dot={{ fill: '#16A34A', r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#15803D', stroke: '#FFFFFF', strokeWidth: 2.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Distribution Pie — Tall Card */}
        <motion.div variants={itemVariants} id="chart-role-distribution" className="bento-card col-span-1 row-span-2">
          <h2 className="text-base font-black text-slate-900 font-heading mb-0.5">User Roles</h2>
          <p className="text-xs font-semibold text-slate-500 mb-3">Live distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.filter((d) => d.value > 0).map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
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
          <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-sm p-1 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Vireon Safety Logo" className="w-full h-full object-contain object-center scale-105" />
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

        {/* ── Alumni Placement Hall of Fame Section ── */}
        <motion.div variants={itemVariants} id="section-placements" className="bento-card col-span-1 sm:col-span-2 lg:col-span-4 p-6 bg-gradient-to-br from-white via-white to-emerald-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 flex-shrink-0">
                <Award className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-black font-heading text-slate-900 flex items-center gap-2">
                  Placement Hall of Fame
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
                    100% Verified Placements
                  </span>
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Recent institute alumni placed in top infrastructure, automotive, power, and solar corporations across India
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Highest: ₹30,000 / mo
              </span>
            </div>
          </div>

          {/* Grid of Framed Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {PLACED_CANDIDATES.map((student) => (
              <div
                key={student.id}
                className="group relative rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-500/60 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* ── Top Bar (Clean, Outside Photo) ── */}
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-1.5">
                  <span className="bg-emerald-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    PLACED
                  </span>
                  {student.badge ? (
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                      {student.badge}
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-bold text-slate-400">Alumni</span>
                  )}
                </div>

                {/* ── Photo Frame: 100% Clear View (No Text Overlap on Face/Helmet) ── */}
                <div className="relative h-56 w-full bg-slate-900 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={student.image}
                    alt={student.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 border-b border-black/10 pointer-events-none" />
                </div>

                {/* ── Dedicated Standout Salary Banner ── */}
                <div className="mx-3 mt-3 p-2 bg-gradient-to-r from-emerald-50 to-green-50/80 border-1.5 border-emerald-300/80 rounded-xl flex items-center justify-between shadow-xs">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-800">Monthly Salary</span>
                  <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {student.salary}
                  </span>
                </div>

                {/* ── Card Information Body ── */}
                <div className="p-3.5 pt-2.5 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-heading text-sm font-black text-slate-900 truncate">
                        {student.name}
                      </h4>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{student.company}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="truncate">{student.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-600 font-semibold truncate max-w-[130px]">{student.role}</span>
                    <span className="text-emerald-700 font-bold">Verified</span>
                  </div>
                </div>
              </div>
            ))}
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
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white border-2 border-emerald-500/30 border-b-4 border-r-4 border-emerald-600/40 hover:border-emerald-500 text-slate-800 hover:text-emerald-900 shadow-sm active:border-b-2 active:border-r-2 active:translate-y-0.5 transition-all text-xs font-black"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-300 shadow-inner flex-shrink-0">
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="truncate">{action.label}</span>
              </a>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
