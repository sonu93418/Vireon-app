'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { FileUpload } from '@/components/ui/FileUpload';

interface GalleryItem {
  _id: string;
  title: string;
  category: string;
  mediaUrl: string;
  imageUrl?: string;
  description?: string;
}

const gallerySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  mediaUrl: z.string().min(1, 'Please upload an image'),
  mediaPublicId: z.string().optional(),
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

  const { register, handleSubmit, control, setValue, formState: { errors }, reset } = useForm<GalleryForm>({
    resolver: zodResolver(gallerySchema),
    defaultValues: { category: 'EVENT' },
  });

  const createMutation = useMutation({
    mutationFn: (values: GalleryForm) =>
      apiClient.post('/gallery', {
        ...values,
        imageUrl: values.mediaUrl,
        imagePublicId: values.mediaPublicId || 'vireon-gallery-img',
      }),
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
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Image & Media Gallery</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">Upload event photographs, practical activities, achievements & campus media</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary" id="add-gallery-btn">
          <Plus className="w-4 h-4" /> Upload Media
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="vireon-card p-6 border border-vireon-accent-green/30">
          <h2 className="font-heading text-base font-semibold text-vireon-text-primary mb-4">Add Media to Gallery</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Image Title</label>
                <input {...register('title')} placeholder="Practical Fire Safety Drill 2026" className="vireon-input" />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Category</label>
                <select {...register('category')} className="vireon-input">
                  <option value="EVENT">Events & Seminars</option>
                  <option value="PRACTICAL">Practical Training & Drills</option>
                  <option value="ACHIEVEMENT">Achievements & Placements</option>
                  <option value="CAMPUS">Campus & Labs</option>
                  <option value="WORKSHOP">Workshops & Safety Demos</option>
                </select>
              </div>
            </div>

            <div>
              <FileUpload
                type="image"
                folder="vireon/gallery"
                label="Upload Image (Drag & Drop or Pick File)"
                onChange={(secureUrl, publicId) => {
                  setValue('mediaUrl', secureUrl);
                  if (publicId) setValue('mediaPublicId', publicId);
                }}
              />
              {errors.mediaUrl && <p className="text-xs text-red-400 mt-1">{errors.mediaUrl.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createMutation.isPending} className="vireon-btn-primary">
                {createMutation.isPending ? 'Saving...' : 'Save to Gallery'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="vireon-card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="vireon-skeleton h-48 rounded-xl" />)
            : (data?.data ?? []).map((img) => (
                <div key={img._id} className="relative group rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.mediaUrl || img.imageUrl} alt={img.title} className="w-full h-40 object-cover" />
                  <div className="p-3">
                    <span className="vireon-badge-green text-[9px]">{img.category}</span>
                    <h4 className="font-heading text-xs font-bold text-vireon-text-primary mt-1 truncate">{img.title}</h4>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(img._id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete item"
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
