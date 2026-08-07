'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { GraduationCap, Plus, Search, CheckCircle, Award, Star, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Qualification {
  degree: string;
  institution?: string;
  year?: number;
  specialization?: string;
}

interface Teacher {
  _id: string;
  designation: string;
  qualifications: Qualification[];
  specializations: string[];
  certifications: string[];
  experienceYears: number;
  rating: number;
  bio?: string;
  isVerified: boolean;
  profileImageUrl?: string;
  userId?: { fullName: string; email: string };
}

const teacherSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  designation: z.string().min(1, 'Designation is required'),
  experienceYears: z.number().min(0),
  qualifications: z.string().min(1),
  specializations: z.string().min(1),
});

type TeacherForm = z.infer<typeof teacherSchema>;

export default function TeachersPage() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Teacher[] }>('/teachers');
      return res.data;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TeacherForm>({
    resolver: zodResolver(teacherSchema),
  });

  const createMutation = useMutation({
    mutationFn: (values: TeacherForm) =>
      apiClient.post('/teachers', {
        ...values,
        qualifications: [{ degree: values.qualifications, institution: 'Vireon Institute', year: 2020 }],
        specializations: values.specializations.split(',').map((s) => s.trim()),
        certifications: ['OSHA_CERTIFIED', 'IOSH_CERTIFIED'],
        bio: `${values.designation} with ${values.experienceYears} years of industrial safety experience.`,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      reset();
      setShowForm(false);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/teachers/${id}/verify`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });

  const teacherList = data?.data ?? [];
  const filtered = teacherList.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (t.userId?.fullName ?? '').toLowerCase();
    const des = (t.designation ?? '').toLowerCase();
    const spec = (t.specializations || []).join(' ').toLowerCase();
    return name.includes(q) || des.includes(q) || spec.includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-black text-slate-900">Teachers & Safety Experts</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Real-time industrial safety trainers, MD/CEO & certified lead auditors ({teacherList.length} Total)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-500/20 text-xs font-bold text-slate-700 hover:bg-emerald-50 transition-all shadow-xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-emerald-600', isFetching && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary text-xs py-2 px-3" id="add-teacher-btn">
            <Plus className="w-4 h-4" /> Add Trainer
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border border-emerald-500/30 shadow-md">
          <h2 className="font-heading text-base font-black text-slate-900 mb-4">Add Certified Trainer Profile</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Faculty User ID</label>
                <input {...register('userId')} placeholder="User ObjectId..." className="clay-input w-full py-2 text-xs" />
                {errors.userId && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.userId.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation & Role</label>
                <input {...register('designation')} placeholder="OSHA Certified Trainer / MD & CEO" className="clay-input w-full py-2 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Years of Experience</label>
                <input type="number" {...register('experienceYears', { valueAsNumber: true })} className="clay-input w-full py-2 text-xs" defaultValue={8} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications</label>
                <input {...register('qualifications')} placeholder="B.Tech EHS, ADIS, NEBOSH" className="clay-input w-full py-2 text-xs" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Specializations (comma separated)</label>
              <input {...register('specializations')} placeholder="IOSH Safety Management, OSHA Compliance, Fire Hydrant Drills" className="clay-input w-full py-2 text-xs" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="vireon-btn-primary text-xs py-2">
                {createMutation.isPending ? 'Saving...' : 'Save Profile'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary text-xs py-2">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="bg-white p-5 rounded-3xl border border-emerald-500/15 shadow-xs space-y-5">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search Gagan Sir, Prince Sir, Raj Sir, OSHA, IOSH..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="clay-input pl-10 py-2 text-sm w-full"
          />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse" />)
            : filtered.length === 0
            ? (
                <div className="col-span-full py-12 text-center text-slate-400 text-xs font-bold">
                  No safety trainers found.
                </div>
              )
            : filtered.map((t) => (
                <div
                  key={t._id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-500/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Avatar + Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-13 h-13 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-700 flex-shrink-0 text-lg shadow-xs">
                        {t.userId?.fullName ? t.userId.fullName.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-heading text-sm font-black text-slate-900 truncate">
                            {t.userId?.fullName || 'Faculty Trainer'}
                          </h3>
                          {t.isVerified && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-emerald-700 font-extrabold mt-0.5 leading-tight">
                          {t.designation}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold text-slate-500">
                          <span>{t.experienceYears} Years Exp</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {t.rating || 5.0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Certifications Badges */}
                    {t.certifications && t.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {t.certifications.map((c) => (
                          <span key={c} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            <Award className="w-3 h-3 text-emerald-600" />
                            {c.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Specializations Pills */}
                    {t.specializations && t.specializations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Specializations</p>
                        <div className="flex flex-wrap gap-1">
                          {t.specializations.map((s) => (
                            <span key={s} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-lg">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Verification Status / Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider',
                      t.isVerified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    )}>
                      {t.isVerified ? 'VERIFIED' : 'PENDING'}
                    </span>
                    {!t.isVerified && (
                      <button
                        onClick={() => verifyMutation.mutate(t._id)}
                        className="text-xs text-emerald-700 font-extrabold hover:underline"
                      >
                        Approve Profile
                      </button>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </motion.div>
  );
}
