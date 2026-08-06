'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { GraduationCap, Plus, Search, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';

interface Teacher {
  _id: string;
  designation: string;
  qualifications: string[];
  specializations: string[];
  experienceYears: number;
  rating: number;
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

  const { data, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Teacher[] }>('/teachers');
      return res.data;
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TeacherForm>({
    resolver: zodResolver(teacherSchema),
  });

  const createMutation = useMutation({
    mutationFn: (values: TeacherForm) =>
      apiClient.post('/teachers', {
        ...values,
        qualifications: values.qualifications.split(',').map((s) => s.trim()),
        specializations: values.specializations.split(',').map((s) => s.trim()),
        certifications: ['OSHA_TRAINER'],
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

  const filtered = (data?.data ?? []).filter((t) =>
    search ? (t.userId?.fullName ?? '').toLowerCase().includes(search.toLowerCase()) || t.designation.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Teachers & Experts</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">Manage industrial safety trainers & auditor profiles</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary" id="add-teacher-btn">
          <Plus className="w-4 h-4" /> Add Teacher
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="vireon-card p-6 border border-vireon-accent-green/30">
          <h2 className="font-heading text-base font-semibold text-vireon-text-primary mb-4">Add Trainer Profile</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">User ID</label>
                <input {...register('userId')} placeholder="User ObjectId..." className="vireon-input" />
                {errors.userId && <p className="text-xs text-red-400 mt-1">{errors.userId.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Designation</label>
                <input {...register('designation')} placeholder="OSHA Certified Trainer / Lead Auditor" className="vireon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Years of Experience</label>
                <input type="number" {...register('experienceYears', { valueAsNumber: true })} className="vireon-input" defaultValue={5} />
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Qualifications (comma separated)</label>
                <input {...register('qualifications')} placeholder="B.Sc Safety, IOSH, NEBOSH" className="vireon-input" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Specializations (comma separated)</label>
              <input {...register('specializations')} placeholder="Doubt Classes, Interview Prep, Theory" className="vireon-input" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="vireon-btn-primary">
                {createMutation.isPending ? 'Saving...' : 'Save Profile'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="vireon-card p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vireon-text-muted" />
          <input placeholder="Search trainer name or designation..." value={search} onChange={(e) => setSearch(e.target.value)} className="vireon-input pl-9" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="vireon-skeleton h-48 rounded-xl" />)
            : filtered.map((t) => (
                <div key={t._id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-vireon-accent-green/10 border border-vireon-accent-green/30 flex items-center justify-center font-bold text-vireon-success flex-shrink-0 text-lg">
                      {t.userId?.fullName?.charAt(0) ?? 'T'}
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-vireon-text-primary">{t.userId?.fullName ?? 'Faculty Trainer'}</h3>
                      <p className="text-xs text-vireon-success font-medium">{t.designation}</p>
                      <p className="text-[10px] text-vireon-text-muted mt-1">{t.experienceYears} Years Exp • ⭐ {t.rating}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className={t.isVerified ? 'vireon-badge-green text-[10px]' : 'vireon-badge-warning text-[10px]'}>
                      {t.isVerified ? 'Verified' : 'Pending'}
                    </span>
                    {!t.isVerified && (
                      <button onClick={() => verifyMutation.mutate(t._id)} className="text-xs text-vireon-success font-semibold hover:underline">
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
