'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Search, Send, Users, Bell, Trash2 } from 'lucide-react';
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

const NOTIF_TYPES = ['ANNOUNCEMENT', 'CLASS_REMINDER', 'CLASS_STARTED', 'COURSE_UPDATE', 'NEW_BLOG', 'PLACEMENT', 'SYSTEM'];

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

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<NotifForm>({
    resolver: zodResolver(notifSchema),
    defaultValues: { type: 'ANNOUNCEMENT', targetRoles: [] },
  });

  const sendMutation = useMutation({
    mutationFn: (data: NotifForm) => apiClient.post('/notifications/send', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      reset();
      setShowForm(false);
      alert('✅ Lock Screen Push Notification sent successfully!');
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Failed to send notification.';
      if (status === 401 || msg.includes('Access token has expired')) {
        alert('⚠️ Session Expired: Your admin login session has expired. Please log in again to send notifications.');
        window.location.href = '/login';
      } else {
        alert(`❌ Notification Send Error: ${msg}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notifications/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const PRESET_TEMPLATES = [
    { label: '⏰ Class Reminder', type: 'CLASS_REMINDER', title: '⏰ Upcoming Class: React Native Deep Dive', body: 'Your live session starts in 15 minutes. Tap to open your classroom now!' },
    { label: '🚨 Class Live', type: 'CLASS_STARTED', title: '🚨 LIVE NOW: Advanced Web Development', body: 'Professor Sharma has launched the live class! Click to join immediately.' },
    { label: '💼 Placement Drive', type: 'PLACEMENT', title: '💼 Placement Alert: Google SDE-1 Hiring', body: 'Package: 18 LPA. Apply before tomorrow 5 PM. Tap to check requirements.' },
    { label: '📚 New Module', type: 'COURSE_UPDATE', title: '📚 New Course Content: Node.js Microservices', body: 'Module 4: Distributed Tracing & Caching is now published! Start learning today.' },
    { label: '📢 Campus Notice', type: 'ANNOUNCEMENT', title: '📢 Campus Update: Mid-Term Examination Schedule', body: 'The mid-term exam schedule for Fall 2026 is released. Check the portal for details.' },
    { label: '⚙️ System Notice', type: 'SYSTEM', title: '⚙️ System Maintenance: Scheduled Upgrades', body: 'Vireon services will undergo maintenance tonight from 2 AM to 4 AM IST.' },
  ];

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-semibold text-vireon-text-primary">📣 Send Lock Screen Push Notification</h2>
            <span className="vireon-badge-green text-xs font-semibold flex items-center gap-1 px-2.5 py-1">
              ⚡ High Priority & Lock Screen Display
            </span>
          </div>

          {/* Quick Lock Screen Templates */}
          <div className="mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <p className="text-xs font-bold text-slate-700 mb-2">⚡ Quick Lock Screen Templates:</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    setValue('title', tpl.title);
                    setValue('body', tpl.body);
                    setValue('type', tpl.type);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-vireon-accent-green hover:bg-green-50/50 hover:text-green-800 transition-all shadow-2xs cursor-pointer"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

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
                {sendMutation.isPending ? 'Sending Push...' : 'Send Lock Screen Push'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Notification List */}
      <div className="clay-card p-6 bg-white border border-green-600/20 space-y-3">
        <h2 className="section-title mb-4">Broadcast & Push Notification History</h2>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="vireon-skeleton h-16 rounded-2xl" />)
          : (data?.data ?? []).map((notif) => (
              <div key={notif._id} className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-green-600/15 hover:border-green-600/30 transition-all shadow-sm">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  notif.type === 'CLASS_REMINDER' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200')}>
                  <Bell className={cn('w-4.5 h-4.5', notif.type === 'CLASS_REMINDER' ? 'text-blue-600' : 'text-green-600')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{notif.title}</p>
                    {notif.isSent && <span className="vireon-badge-green text-[10px]">Pushed</span>}
                    <span className="vireon-badge text-[10px] bg-slate-100 text-slate-600 border border-slate-200">{notif.type.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1 line-clamp-2">{notif.body}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold">{formatDateTime(notif.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this notification record?')) {
                        deleteMutation.mutate(notif._id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
        }
      </div>
    </motion.div>
  );
}
