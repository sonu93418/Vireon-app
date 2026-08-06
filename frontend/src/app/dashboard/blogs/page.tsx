'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FileText, Plus, Search, Eye, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

interface Blog {
  _id: string; title: string; category: string; viewsCount: number;
  readTimeMinutes: number; isPublished: boolean; publishedAt: string;
}

const blogSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  excerpt: z.string().min(1),
  contentHtml: z.string().min(1),
  readTimeMinutes: z.number().min(1),
  isPublished: z.boolean().default(true),
});

type BlogForm = z.infer<typeof blogSchema>;

export default function BlogsAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['blogs', 'admin'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Blog[] }>('/blogs/admin');
      return res.data;
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<BlogForm>({
    resolver: zodResolver(blogSchema),
    defaultValues: { category: 'INDUSTRIAL_SAFETY', readTimeMinutes: 5, isPublished: true },
  });

  const createMutation = useMutation({
    mutationFn: (values: BlogForm) =>
      apiClient.post('/blogs', {
        ...values,
        slug: values.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        tags: ['Safety', 'OSHA', 'Training'],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blogs'] });
      reset();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/blogs/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['blogs'] }),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Blogs & Announcements</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">Publish articles, OSHA compliance updates & safety educational content</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary" id="add-blog-btn">
          <Plus className="w-4 h-4" /> Create Article
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="vireon-card p-6 border border-vireon-accent-green/30">
          <h2 className="font-heading text-base font-semibold text-vireon-text-primary mb-4">Publish Educational Article</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Article Title</label>
                <input {...register('title')} placeholder="Essential Hazard Communication Rules for Chemical Safety" className="vireon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Category</label>
                <select {...register('category')} className="vireon-input">
                  <option value="INDUSTRIAL_SAFETY">Industrial Safety</option>
                  <option value="FIRE_SAFETY">Fire Safety</option>
                  <option value="OCCUPATIONAL_HEALTH">Occupational Health</option>
                  <option value="ENVIRONMENTAL">Environmental Safety</option>
                  <option value="OSHA_COMPLIANCE">OSHA Compliance</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Excerpt Summary</label>
              <textarea {...register('excerpt')} rows={2} className="vireon-input resize-none" placeholder="Short introduction for feed card preview..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-1">HTML Content</label>
              <textarea {...register('contentHtml')} rows={6} className="vireon-input font-mono text-xs resize-none" placeholder="<p>Article body html content...</p>" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="vireon-btn-primary">
                {createMutation.isPending ? 'Publishing...' : 'Publish Article'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="vireon-card p-6">
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="vireon-skeleton h-16 rounded-xl" />)
            : (data?.data ?? []).map((b) => (
                <div key={b._id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-sm font-bold text-vireon-text-primary">{b.title}</h3>
                      <span className="vireon-badge-green text-[10px]">{b.category.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-vireon-text-muted mt-0.5">
                      📅 {formatDate(b.publishedAt)} • {b.readTimeMinutes} min read • 👁️ {b.viewsCount} views
                    </p>
                  </div>
                  <button onClick={() => deleteMutation.mutate(b._id)} className="p-2 text-vireon-text-muted hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
        </div>
      </div>
    </motion.div>
  );
}
