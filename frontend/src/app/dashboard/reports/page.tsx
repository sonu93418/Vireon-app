'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, GraduationCap, Award } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface UserReport {
  totalUsers: number;
  roleStats: Array<{ _id: string; count: number }>;
  statusStats: Array<{ _id: string; count: number }>;
}

interface TeacherReport {
  totalTeachers: number;
  teacherStats: Array<{ id: string; name: string; email?: string; designation: string; rating: number; totalClasses: number }>;
}

export default function ReportsAdminPage() {
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['reports', 'users'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserReport }>('/reports/users');
      return res.data.data;
    },
  });

  const { data: teacherData, isLoading: teacherLoading } = useQuery({
    queryKey: ['reports', 'teachers'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TeacherReport }>('/reports/teachers');
      return res.data.data;
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">System Analytics & Reports</h1>
        <p className="text-sm text-vireon-text-muted mt-0.5">Overview metrics for users, trainers, and class distribution</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* User Summary Report */}
        <div className="vireon-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-vireon-accent-green/10 border border-vireon-accent-green/30 flex items-center justify-center text-vireon-success">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-vireon-text-primary">User Accounts Summary</h2>
              <p className="text-xs text-vireon-text-muted">Total Registered: {userData?.totalUsers ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold text-vireon-text-secondary uppercase tracking-wider">Role Breakdown</h3>
            {userData?.roleStats.map((r) => (
              <div key={r._id} className="flex justify-between items-center text-xs">
                <span className="text-vireon-text-muted">{r._id}</span>
                <span className="font-bold text-vireon-text-primary">{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Teacher Summary Report */}
        <div className="vireon-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-vireon-accent-green/10 border border-vireon-accent-green/30 flex items-center justify-center text-vireon-success">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-vireon-text-primary">Trainer Performance Report</h2>
              <p className="text-xs text-vireon-text-muted">Active Trainers: {teacherData?.totalTeachers ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold text-vireon-text-secondary uppercase tracking-wider">Trainer Class Volume</h3>
            {teacherData?.teacherStats.map((t) => (
              <div key={t.id} className="flex justify-between items-center text-xs">
                <span className="text-vireon-text-primary font-medium">{t.name} ({t.designation})</span>
                <span className="vireon-badge-green text-[10px]">{t.totalClasses} classes conducted</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
