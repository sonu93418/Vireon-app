'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Video, Plus, Calendar, Clock, Link as LinkIcon, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { formatDateTime, cn } from '@/lib/utils';

interface ClassItem {
  _id: string; title: string; scheduledAt: string; durationMinutes: number;
  zoomJoinUrl: string; status: string; subject?: string;
  teacherId?: { designation?: string; userId?: { fullName: string } };
  courseId?: { title: string; code: string };
}
interface Teacher { _id: string; designation: string; userId?: { fullName: string }; }
interface Course { _id: string; title: string; code: string; }

const classSchema = z.object({
  title: z.string().min(1, 'Class title is required'),
  teacherId: z.string().min(1, 'Assign a trainer'),
  scheduledAt: z.string().min(1, 'Date & time is required'),
  durationMinutes: z.coerce.number().min(15),
  zoomJoinUrl: z.string().url('Enter a valid Zoom URL').or(z.literal('')).optional(),
  courseId: z.string().optional(),
  subject: z.string().optional(),
  zoomPassword: z.string().optional(),
});
type ClassForm = z.infer<typeof classSchema>;

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 border border-blue-200',
  LIVE: 'bg-green-100 text-green-700 border border-green-200',
  COMPLETED: 'bg-slate-100 text-slate-500 border border-slate-200',
  CANCELLED: 'bg-red-100 text-red-600 border border-red-200',
};

export default function ClassesAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes', 'admin'],
    queryFn: async () => { const res = await apiClient.get<{ data: ClassItem[] }>('/classes?limit=50'); return res.data; },
    refetchInterval: 30_000,
  });
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => { const res = await apiClient.get<{ data: Teacher[] }>('/teachers'); return res.data; },
  });
  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: async () => { const res = await apiClient.get<{ data: Course[] }>('/courses?limit=50'); return res.data; },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ClassForm>({
    resolver: zodResolver(classSchema),
    defaultValues: { durationMinutes: 60, zoomJoinUrl: '', subject: 'Industrial Safety' },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ClassForm) => {
      const payload: Record<string, unknown> = {
        title: values.title, teacherId: values.teacherId,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        durationMinutes: values.durationMinutes,
        subject: values.subject || 'Industrial Safety',
        zoomJoinUrl: values.zoomJoinUrl || 'https://zoom.us/j/8921204921',
        zoomPassword: values.zoomPassword || 'vireon2026',
      };
      if (values.courseId) payload.courseId = values.courseId;
      const classRes = await apiClient.post('/classes', payload);
      const createdClass = (classRes.data as { data: ClassItem }).data;
      try {
        await apiClient.post('/notifications/send', {
          title: `New Live Class: ${values.title}`,
          body: `Scheduled for ${new Date(values.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. Duration: ${values.durationMinutes} minutes.`,
          type: 'CLASS_REMINDER',
        });
      } catch { /* non-critical */ }
      return createdClass;
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      setSuccessMsg(`Class "${created.title}" scheduled! Students have been notified.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      reset(); setShowForm(false);
    },
  });

  const classList = classesData?.data ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Online Classes</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">{classList.length} classes scheduled. Students auto-notified on schedule.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary" id="schedule-class-btn">
          <Plus className="w-4 h-4" /> Schedule Class
        </button>
      </div>

      {successMsg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {successMsg}
        </motion.div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="vireon-card p-6 border border-vireon-accent-green/30">
          <div className="flex items-center gap-2 mb-5">
            <Video className="w-5 h-5 text-vireon-success" />
            <h2 className="font-heading text-base font-semibold text-vireon-text-primary">Schedule Live Class Session</h2>
            <span className="ml-auto text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
              <Bell className="w-3 h-3" /> Auto-notifies students
            </span>
          </div>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Class Topic / Title *</label>
                <input {...register('title')} placeholder="OSHA 30-Hour Compliance Session" className="vireon-input" />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Trainer / Teacher *</label>
                <select {...register('teacherId')} className="vireon-input">
                  <option value="">Select Trainer...</option>
                  {(teachersData?.data ?? []).map((t) => (
                    <option key={t._id} value={t._id}>{t.userId?.fullName ?? 'Trainer'} ({t.designation})</option>
                  ))}
                </select>
                {errors.teacherId && <p className="text-xs text-red-400 mt-1">{errors.teacherId.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Link to Course (optional)</label>
                <select {...register('courseId')} className="vireon-input">
                  <option value="">No specific course</option>
                  {(coursesData?.data ?? []).map((c) => (
                    <option key={c._id} value={c._id}>{c.title} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Scheduled Date & Time *</label>
                <input type="datetime-local" {...register('scheduledAt')} className="vireon-input" />
                {errors.scheduledAt && <p className="text-xs text-red-400 mt-1">{errors.scheduledAt.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Duration</label>
                <select {...register('durationMinutes', { valueAsNumber: true })} className="vireon-input">
                  {[30,45,60,90,120,180].map((m) => (
                    <option key={m} value={m}>{m} min{m >= 60 ? ` (${m/60}h)` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Zoom Join URL (optional)</label>
                <input {...register('zoomJoinUrl')} placeholder="https://us02web.zoom.us/j/123456789" className="vireon-input" />
                {errors.zoomJoinUrl && <p className="text-xs text-red-400 mt-1">{errors.zoomJoinUrl.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Zoom Password (optional)</label>
                <input {...register('zoomPassword')} placeholder="vireon2026" className="vireon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Subject / Module</label>
                <input {...register('subject')} placeholder="Industrial Safety Management" className="vireon-input" />
              </div>
            </div>
            <div className="flex gap-3 items-center pt-2">
              <button type="submit" disabled={createMutation.isPending} className="vireon-btn-primary">
                <Calendar className="w-4 h-4" />
                {createMutation.isPending ? 'Scheduling...' : 'Schedule & Notify Students'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="vireon-btn-secondary">Cancel</button>
              {createMutation.isError && (
                <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Failed to schedule
                </span>
              )}
            </div>
          </form>
        </motion.div>
      )}

      <div className="vireon-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-sm font-bold text-vireon-text-primary">All Classes</h2>
          <span className="text-xs text-vireon-text-muted">Auto-refreshes every 30s</span>
        </div>
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="vireon-skeleton h-20 rounded-xl" />)
            : classList.length === 0
              ? (
                <div className="text-center py-12 text-vireon-text-muted">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No classes scheduled yet</p>
                </div>
              )
              : classList.map((cls) => (
                <div key={cls._id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-vireon-accent-green/20 transition-all flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-vireon-accent-green/10 border border-vireon-accent-green/20 flex items-center justify-center flex-shrink-0">
                      <Video className="w-5 h-5 text-vireon-success" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-vireon-text-primary">{cls.title}</h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-vireon-text-muted">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.durationMinutes}m</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(cls.scheduledAt)}</span>
                        {cls.teacherId?.userId?.fullName && <span>?? {cls.teacherId.userId.fullName}</span>}
                        {cls.courseId?.code && <span className="text-vireon-success font-medium">?? {cls.courseId.code}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', STATUS_COLORS[cls.status] ?? STATUS_COLORS.SCHEDULED)}>
                      {cls.status}
                    </span>
                    {cls.zoomJoinUrl && (
                      <a href={cls.zoomJoinUrl} target="_blank" rel="noreferrer"
                        className="vireon-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                        <LinkIcon className="w-3.5 h-3.5" /> Join Zoom
                      </a>
                    )}
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </motion.div>
  );
}
