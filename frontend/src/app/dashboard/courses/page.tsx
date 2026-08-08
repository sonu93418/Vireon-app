'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BookOpen, Plus, Search, FileText, Award } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';

interface Course {
  _id: string; title: string; code: string; level: string; duration: number; durationType: string;
  feeAmount: number; isPlacementGuaranteed: boolean; syllabusPdfUrl?: string;
}

const courseSchema = z.object({
  title: z.string().min(1),
  code: z.string().min(1),
  level: z.string().min(1),
  duration: z.number().min(1),
  durationType: z.string().default('MONTHS'),
  feeAmount: z.number().min(0),
  shortDescription: z.string().min(1),
  isPlacementGuaranteed: z.boolean().default(true),
  syllabusPdfUrl: z.string().optional(),
});

type CourseForm = z.infer<typeof courseSchema>;

export default function CoursesAdminPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'admin'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Course[] }>('/courses');
      return res.data;
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: { level: 'DIPLOMA', durationType: 'MONTHS', isPlacementGuaranteed: true },
  });

  const createMutation = useMutation({
    mutationFn: (values: CourseForm) =>
      apiClient.post('/courses', {
        ...values,
        slug: values.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        domain: 'INDUSTRIAL_SAFETY',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      reset();
      setShowForm(false);
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Course Catalog</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">Manage industrial safety diplomas, degrees & PDF syllabi</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="vireon-btn-primary" id="add-course-btn">
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="vireon-card p-6 border border-vireon-accent-green/30">
          <h2 className="font-heading text-base font-semibold text-vireon-text-primary mb-4">Create New Course</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Course Title</label>
                <input {...register('title')} placeholder="Diploma in Industrial Safety Management" className="vireon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Course Code</label>
                <input {...register('code')} placeholder="DISM-101" className="vireon-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Level</label>
                <select {...register('level')} className="vireon-input">
                  <option value="DIPLOMA">Diploma</option>
                  <option value="ADVANCED_DIPLOMA">Advanced Diploma</option>
                  <option value="PG_DIPLOMA">PG Diploma</option>
                  <option value="CERTIFICATION">Certification (OSHA/IOSH)</option>
                  <option value="BSC">B.Sc</option>
                  <option value="BTECH">B.Tech</option>
                  <option value="MSC">M.Sc</option>
                  <option value="MTECH">M.Tech</option>
                  <option value="MBA">MBA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Fee Amount (₹)</label>
                <input type="number" {...register('feeAmount', { valueAsNumber: true })} className="vireon-input" defaultValue={25000} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-1">Short Description</label>
              <textarea {...register('shortDescription')} rows={2} className="vireon-input resize-none" placeholder="Comprehensive course covering hazard identification, fire safety..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-vireon-text-secondary mb-1">PDF Syllabus Document URL</label>
              <input {...register('syllabusPdfUrl')} placeholder="https://res.cloudinary.com/.../syllabus.pdf" className="vireon-input" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="vireon-btn-primary">
                {createMutation.isPending ? 'Saving...' : 'Create Course'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="vireon-btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="vireon-card p-6">
        <div className="grid grid-cols-2 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="vireon-skeleton h-40 rounded-xl" />)
            : (data?.data ?? []).map((c) => (
                <div key={c._id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="vireon-badge-green text-[10px]">{c.level.replace(/_/g, ' ')}</span>
                      <h3 className="font-heading text-base font-bold text-vireon-text-primary mt-2">{c.title}</h3>
                      <p className="text-xs text-vireon-text-muted mt-0.5">Code: {c.code} • Duration: {c.duration} {c.durationType.toLowerCase()}</p>
                    </div>
                    <span className="vireon-badge-green text-xs">Govt Accredited</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    {c.isPlacementGuaranteed && (
                      <span className="text-vireon-success font-semibold flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> 100% Job Placement
                      </span>
                    )}
                    {c.syllabusPdfUrl ? (
                      <a href={c.syllabusPdfUrl} target="_blank" rel="noreferrer" className="text-vireon-text-muted hover:text-vireon-text-primary flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-vireon-success" /> PDF Syllabus
                      </a>
                    ) : (
                      <span className="text-vireon-text-muted">No PDF attached</span>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </motion.div>
  );
}
