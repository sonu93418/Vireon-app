'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Search, Send, Users, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { formatDateTime, cn } from '@/lib/utils';

interface Notification {
  _id: string; title: string; body: string; type: string;
  isSent: boolean; isRead: boolean; createdAt: string;
  recipientId?: string; targetRoles?: string[];
}

const notifSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  type: z.string().min(1),
  targetRoles: z.array(z.string()).optional(),
});

type NotifForm = z.infer<typeof notifSchema>;

const NOTIF_TYPES = ['GENERAL', 'CLASS_REMINDER', 'COURSE_UPDATE', 'BLOG_PUBLISHED', 'SYSTEM'];

export default function NotificationsPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'admin'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Notification[]; meta: { total: number } }>('/notifications?limit=20');
      return res.data;
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<NotifForm>({
    resolver: zodResolver(notifSchema),
    defaultValues: { type: 'GENERAL', targetRoles: [] },
  });

  const sendMutation = useMutation({
    mutationFn: (data: NotifForm) => apiClient.post('/notifications/send', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      reset();
      setShowForm(false);
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Notifications</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">{data?.meta.total ?? 0} notifications sent</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary" id="send-notification-btn">
          <Plus className="w-4 h-4" />
          Send Notification
        </button>
      </div>

      {/* Send Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="vireon-card p-6 border border-vireon-accent-green/20">
          <h2 className="font-heading text-base font-semibold text-vireon-text-primary mb-4">📣 Send Broadcast Notification</h2>
          <form onSubmit={handleSubmit((d) => sendMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1.5">Title</label>
                <input {...register('title')} placeholder="Notification title..." className="vireon-input" id="notif-title" />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1.5">Type</label>
                <select {...register('type')} className="vireon-input" id="notif-type">
                  {NOTIF_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-1.5">Message Body</label>
              <textarea {...register('body')} rows={3} placeholder="Write your notification message..." className="vireon-input resize-none" id="notif-body" />
              {errors.body && <p className="text-xs text-red-400 mt-1">{errors.body.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-2">Target Roles (leave empty for all users)</label>
              <div className="flex flex-wrap gap-2">
                {['STUDENT', 'FACULTY', 'ADMIN'].map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" value={role} {...register('targetRoles')} className="accent-vireon-success" />
                    <span className="text-sm text-vireon-text-secondary">{role}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={sendMutation.isPending} className="vireon-btn-primary" id="notif-submit-btn">
                <Send className="w-4 h-4" />
                {sendMutation.isPending ? 'Sending...' : 'Send Now'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Notification List */}
      <div className="vireon-card p-6 space-y-3">
        <h2 className="section-title mb-4">Notification History</h2>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="vireon-skeleton h-16 rounded-xl" />)
          : (data?.data ?? []).map((notif) => (
              <div key={notif._id} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  notif.type === 'CLASS_REMINDER' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-vireon-accent-green/10 border border-vireon-accent-green/20')}>
                  <Bell className={cn('w-4 h-4', notif.type === 'CLASS_REMINDER' ? 'text-blue-400' : 'text-vireon-success')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-vireon-text-primary">{notif.title}</p>
                    {notif.isSent && <span className="vireon-badge-green text-[10px]">Sent</span>}
                    <span className="vireon-badge text-[10px] bg-white/[0.04] text-vireon-text-muted border border-white/[0.08]">{notif.type.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-vireon-text-muted mt-0.5 line-clamp-2">{notif.body}</p>
                </div>
                <span className="text-[10px] text-vireon-text-muted flex-shrink-0">{formatDateTime(notif.createdAt)}</span>
              </div>
            ))
        }
      </div>
    </motion.div>
  );
}
