'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FileText, Save, CheckCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';

const CMS_PAGES = [
  { slug: 'about-us', title: 'About Us' },
  { slug: 'contact-us', title: 'Contact Us & Head Office' },
  { slug: 'terms-and-conditions', title: 'Terms & Conditions' },
  { slug: 'privacy-policy', title: 'Privacy Policy' },
];

export default function CmsAdminPage() {
  const [selectedSlug, setSelectedSlug] = useState('about-us');
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['cms', selectedSlug],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ data: { title: string; contentHtml: string } }>(`/cms/${selectedSlug}`);
        setTitle(res.data.data.title);
        setContentHtml(res.data.data.contentHtml);
        return res.data.data;
      } catch {
        setTitle(CMS_PAGES.find((p) => p.slug === selectedSlug)?.title ?? '');
        setContentHtml('<p>Enter informational content here...</p>');
        return null;
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => apiClient.put(`/cms/${selectedSlug}`, { title, contentHtml, isPublished: true }),
    onSuccess: () => {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">CMS Informational Pages</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">Manage About Us, Contact Us, Privacy Policy & Terms content</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Page Selector */}
        <div className="w-64 space-y-1">
          {CMS_PAGES.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelectedSlug(p.slug)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                selectedSlug === p.slug
                  ? 'bg-vireon-accent-green/10 text-vireon-success border border-vireon-accent-green/20'
                  : 'bg-white/[0.02] text-vireon-text-secondary border border-white/[0.06] hover:bg-white/[0.05]'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>

        {/* Content Editor */}
        <div className="flex-1 vireon-card p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-vireon-accent-green/10 border border-vireon-accent-green/30 text-vireon-success text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Page updated & published live to application!
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Page Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="vireon-input" />
          </div>

          <div>
            <label className="block text-xs font-medium text-vireon-text-secondary mb-1">HTML Body Content</label>
            <textarea
              rows={14}
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              className="vireon-input font-mono text-xs resize-none"
            />
          </div>

          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="vireon-btn-primary" id="save-cms-btn">
            <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Publishing...' : 'Save & Publish'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
