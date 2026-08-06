'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Video, Plus, Calendar, Clock, User, Link as LinkIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

interface ClassItem {
  _id: string; title: string; scheduledAt: string; durationMinutes: number;
  zoomJoinUrl: string; status: string;
  teacherId?: { designation?: string; userId?: { fullName: string } };
}

interface Teacher {
  _id: string;
  designation: string;
  userId?: { fullName: string };
}

const classSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  teacherId: z.string().min(1, 'Teacher selection is required'),
  scheduledAt: z.string().min(1, 'Scheduled Date & Time is required'),
  durationMinutes: z.number().min(15),
  zoomJoinUrl: z.string().url('Valid Zoom join URL is required'),
});

type ClassForm = z.infer<typeof classSchema>;

export default function ClassesAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes', 'admin'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ClassItem[] }>('/classes?limit=30');
      return res.data;
    },
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Teacher[] }>('/teachers');
      return res.data;
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ClassForm>({
    resolver: zodResolver(classSchema),
    defaultValues: { durationMinutes: 60 },
  });

  const createMutation = useMutation({
    mutationFn: (values: ClassForm) =>
      apiClient.post('/classes', {
        ...values,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        subject: 'Industrial Safety',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      reset();
      setShowForm(false);
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Online Classes</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">Schedule live online classes & Zoom rooms for trainers</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary" id="schedule-class-btn">
          <Plus className="w-4 h-4" /> Schedule Class
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="vireon-card p-6 border border-vireon-accent-green/30">
          <h2 className="font-heading text-base font-semibold text-vireon-text-primary mb-4">Schedule Online Class Session</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Class Topic / Title</label>
                <input {...register('title')} placeholder="Doubt Clearing & OSHA Compliance Session" className="vireon-input" />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Assigned Trainer / Teacher</label>
                <select {...register('teacherId')} className="vireon-input">
                  <option value="">Select Trainer...</option>
                  {(teachersData?.data ?? []).map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.userId?.fullName ?? 'Trainer'} ({t.designation})
                    </option>
                  ))}
                </select>
                {errors.teacherId && <p className="text-xs text-red-400 mt-1">{errors.teacherId.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Scheduled Date & Time (IST)</label>
                <input type="datetime-local" {...register('scheduledAt')} className="vireon-input" />
                {errors.scheduledAt && <p className="text-xs text-red-400 mt-1">{errors.scheduledAt.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Duration (Minutes)</label>
                <input type="number" {...register('durationMinutes', { valueAsNumber: true })} className="vireon-input" defaultValue={60} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Zoom Meeting Join Link</label>
              <input {...register('zoomJoinUrl')} placeholder="https://us02web.zoom.us/j/123456789" className="vireon-input" />
              {errors.zoomJoinUrl && <p className="text-xs text-red-400 mt-1">{errors.zoomJoinUrl.message}</p>}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="vireon-btn-primary">
                {createMutation.isPending ? 'Scheduling...' : 'Schedule Class'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="vireon-card p-6">
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="vireon-skeleton h-20 rounded-xl" />)
            : (classesData?.data ?? []).map((cls) => (
                <div key={cls._id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-vireon-accent-green/10 border border-vireon-accent-green/20 flex items-center justify-center text-vireon-success">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-vireon-text-primary">{cls.title}</h3>
                      <p className="text-xs text-vireon-text-muted mt-0.5">
                        Trainer: {cls.teacherId?.userId?.fullName ?? 'Faculty'} • 📅 {formatDateTime(cls.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="vireon-badge-green text-[10px]">{cls.status}</span>
                    <a href={cls.zoomJoinUrl} target="_blank" rel="noreferrer" className="vireon-btn-secondary py-1.5 px-3 text-xs">
                      <LinkIcon className="w-3.5 h-3.5" /> Zoom Link
                    </a>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </motion.div>
  );
}
