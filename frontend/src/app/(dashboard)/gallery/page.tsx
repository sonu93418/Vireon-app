'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';

interface GalleryItem {
  _id: string; title: string; category: string; imageUrl: string; description?: string;
}

const gallerySchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  imageUrl: z.string().url('Valid image URL required'),
  imagePublicId: z.string().default('vireon-gallery-img'),
  description: z.string().optional(),
});

type GalleryForm = z.infer<typeof gallerySchema>;

export default function GalleryAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['gallery'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: GalleryItem[] }>('/gallery');
      return res.data;
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<GalleryForm>({
    resolver: zodResolver(gallerySchema),
    defaultValues: { category: 'EVENTS' },
  });

  const createMutation = useMutation({
    mutationFn: (values: GalleryForm) => apiClient.post('/gallery', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gallery'] });
      reset();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/gallery/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['gallery'] }),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Image Gallery</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">Upload event photographs, educational activities, achievements & placed student photos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary" id="add-gallery-btn">
          <Plus className="w-4 h-4" /> Upload Photo
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="vireon-card p-6 border border-vireon-accent-green/30">
          <h2 className="font-heading text-base font-semibold text-vireon-text-primary mb-4">Add Image to Gallery</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Image Title</label>
                <input {...register('title')} placeholder="Practical Fire Safety Drill 2026" className="vireon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Category</label>
                <select {...register('category')} className="vireon-input">
                  <option value="EVENTS">Events & Activities</option>
                  <option value="ACHIEVEMENTS">Achievements & Placement</option>
                  <option value="PRACTICAL_TRAINING">Practical Training</option>
                  <option value="CAMPUS">Campus & Labs</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Image Cloudinary / Web URL</label>
              <input {...register('imageUrl')} placeholder="https://res.cloudinary.com/.../event.jpg" className="vireon-input" />
              {errors.imageUrl && <p className="text-xs text-red-400 mt-1">{errors.imageUrl.message}</p>}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="vireon-btn-primary">
                {createMutation.isPending ? 'Uploading...' : 'Save to Gallery'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="vireon-card p-6">
        <div className="grid grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="vireon-skeleton h-48 rounded-xl" />)
            : (data?.data ?? []).map((img) => (
                <div key={img._id} className="relative group rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                  <img src={img.imageUrl} alt={img.title} className="w-full h-40 object-cover" />
                  <div className="p-3">
                    <span className="vireon-badge-green text-[9px]">{img.category}</span>
                    <h4 className="font-heading text-xs font-bold text-vireon-text-primary mt-1 truncate">{img.title}</h4>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(img._id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
        </div>
      </div>
    </motion.div>
  );
}
