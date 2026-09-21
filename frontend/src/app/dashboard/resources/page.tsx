'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useCallback, useMemo } from 'react';
import {
  FileText, Upload, Download, Eye, Trash2, Search,
  FolderOpen, Tag, Loader2, X, FileSpreadsheet, Presentation,
  Archive, Image as ImageIcon, CheckCircle2, User
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import axios from 'axios';
import { formatDateTime, cn } from '@/lib/utils';

interface UploadedFile {
  _id: string;
  originalName: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  mimeType: string;
  bytes: number;
  format: string;
  folder: string;
  createdAt: string;
  uploadedBy?: { fullName?: string; email?: string } | string;
}

const UPLOAD_FOLDERS = [
  { value: 'vireon/syllabus', label: 'Course Syllabus' },
  { value: 'vireon/study_materials', label: 'Study Materials' },
  { value: 'vireon/certificates', label: 'Certificates & Templates' },
  { value: 'vireon/forms', label: 'Admission Forms' },
  { value: 'vireon/safety_docs', label: 'Safety Documentation' },
];

const FOLDER_LABELS: Record<string, string> = {
  'vireon/syllabus': 'Course Syllabus',
  'vireon/study_materials': 'Study Materials',
  'vireon/certificates': 'Certificates & Templates',
  'vireon/forms': 'Admission Forms',
  'vireon/safety_docs': 'Safety Documentation',
  'vireon/documents': 'Official Documents',
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getFileTypeDetails(file: UploadedFile) {
  const name = (file.originalName || '').toLowerCase();
  const format = (file.format || '').toLowerCase();

  if (format === 'pdf' || name.endsWith('.pdf')) {
    return {
      label: 'PDF',
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      icon: FileText,
    };
  }
  if (['xlsx', 'xls', 'csv'].includes(format) || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return {
      label: 'EXCEL',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      icon: FileSpreadsheet,
    };
  }
  if (['docx', 'doc'].includes(format) || name.endsWith('.docx') || name.endsWith('.doc')) {
    return {
      label: 'WORD',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      icon: FileText,
    };
  }
  if (['pptx', 'ppt'].includes(format) || name.endsWith('.pptx') || name.endsWith('.ppt')) {
    return {
      label: 'PPT',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      icon: Presentation,
    };
  }
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(format) || /\.(jpe?g|png|webp|gif|svg)$/i.test(name)) {
    return {
      label: 'IMAGE',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      icon: ImageIcon,
    };
  }
  if (['zip', 'rar'].includes(format) || name.endsWith('.zip') || name.endsWith('.rar')) {
    return {
      label: 'ARCHIVE',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      icon: Archive,
    };
  }
  return {
    label: (format || 'DOC').toUpperCase(),
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    icon: FileText,
  };
}

export default function ResourcesPage() {
  const [uploadFolder, setUploadFolder] = useState('vireon/syllabus');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['uploads', 'all'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ data: UploadedFile[] }>('/upload/all');
        return res.data;
      } catch (err) {
        console.warn('apiClient fetch failed, trying direct localhost:', err);
        try {
          const direct = await axios.get('http://localhost:5000/api/v1/upload/all');
          return direct.data;
        } catch {
          return { data: [] };
        }
      }
    },
    refetchInterval: 15000,
  });

  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('vireon_deleted_resources');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const recordDeletedId = useCallback((id: string, publicId?: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      if (id) next.add(id);
      if (publicId) next.add(publicId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('vireon_deleted_resources', JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
  }, []);

  const fileList: UploadedFile[] = useMemo(() => {
    let liveItems: UploadedFile[] = [];
    if (Array.isArray(data)) liveItems = data;
    else if (Array.isArray((data as any)?.data)) liveItems = (data as any).data;

    // Filter out any locally deleted IDs immediately for 0ms optimistic response
    return liveItems.filter(
      (item) => !deletedIds.has(item._id) && !deletedIds.has(item.publicId)
    );
  }, [data, deletedIds]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress('Uploading ' + file.name + ' to Cloudinary...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', uploadFolder);

      const fileName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(fileName);

      const endpoint = isPdf
        ? '/upload/pdf'
        : isImage
          ? '/upload/image'
          : isVideo
            ? '/upload/video'
            : '/upload/document';

      const res = await apiClient.post<{ data: UploadedFile }>(endpoint, formData, {
        timeout: 180000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            if (percent < 100) {
              setUploadProgress(`Uploading ${file.name} (${percent}%)...`);
            } else {
              setUploadProgress(`Processing ${file.name} on Cloudinary...`);
            }
          }
        },
      });
      return res.data.data;
    },
    onSuccess: async (uploaded) => {
      setUploadProgress('');
      await queryClient.invalidateQueries({ queryKey: ['uploads'] });
      await queryClient.refetchQueries({ queryKey: ['uploads', 'all'] });
      void apiClient.post('/notifications/send', {
        title: 'New Study Material: ' + uploaded.originalName,
        body: 'A new document ' + uploaded.originalName + ' has been uploaded. Open the app to view and download.',
        type: 'COURSE_UPDATE',
      }).catch(() => {});
    },
    onError: (err: any) => {
      setUploadProgress('');
      const msg = err?.response?.data?.message || err?.message || 'Unknown error occurred during upload';
      alert('Upload Failed: ' + msg);
    },
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async ({ id, publicId, resourceType }: { id: string; publicId: string; resourceType: string }) => {
      setDeletingId(id);
      // Instantaneous optimistic removal from UI (0ms delay)
      recordDeletedId(id, publicId);

      const type = resourceType === 'image' ? 'image' : 'raw';
      const target = id || encodeURIComponent(publicId);
      const queryParams = `?type=${type}&id=${encodeURIComponent(id || '')}&publicId=${encodeURIComponent(publicId || '')}`;
      try {
        await apiClient.delete('/upload/' + target + queryParams, { timeout: 6000 });
      } catch (err) {
        console.warn('apiClient delete failed, trying direct localhost:', err);
        try {
          await axios.delete('http://localhost:5000/api/v1/upload/' + target + queryParams, { timeout: 6000 });
        } catch (directErr) {
          console.warn('Direct delete warning:', directErr);
        }
      }
    },
    onSuccess: async () => {
      setDeletingId(null);
      await queryClient.invalidateQueries({ queryKey: ['uploads'] });
      await queryClient.refetchQueries({ queryKey: ['uploads', 'all'] });
    },
    onError: (err: any) => {
      setDeletingId(null);
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete resource';
      alert('Delete Failed: ' + msg);
    },
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const maxBytes = 50 * 1024 * 1024;
      if (file.size > maxBytes) {
        alert(file.name + ' exceeds the 50 MB limit.');
        return;
      }
      uploadMutation.mutate(file);
    });
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const filteredFiles = useMemo(() => {
    return fileList.filter((f) => {
      if (selectedFolderFilter !== 'all' && f.folder !== selectedFolderFilter) {
        return false;
      }
      if (!searchQ.trim()) return true;
      const q = searchQ.toLowerCase();
      return (
        f.originalName.toLowerCase().includes(q) ||
        (f.folder && f.folder.toLowerCase().includes(q)) ||
        (f.format && f.format.toLowerCase().includes(q))
      );
    });
  }, [fileList, selectedFolderFilter, searchQ]);

  // Compute folder counts
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: fileList.length };
    UPLOAD_FOLDERS.forEach((f) => {
      counts[f.value] = fileList.filter((item) => item.folder === f.value).length;
    });
    return counts;
  }, [fileList]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Study Resources & Documents</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">
            Cloud-synced materials (PDF, Word, Excel, PPT) available instantly to Mobile & Web students
          </p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="vireon-btn-primary" id="upload-resource-btn">
          <Upload className="w-4 h-4" /> Upload Resource
        </button>
        <input ref={fileInputRef} type="file" className="hidden" multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg"
          onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* ── Drag & Drop Area ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-vireon-success bg-green-500/10 scale-[1.01]'
            : 'border-white/10 hover:border-vireon-accent-green/40 hover:bg-white/[0.02]'
        )}>
        <div className="flex flex-col items-center gap-3">
          {uploadMutation.isPending ? (
            <Loader2 className="w-10 h-10 text-vireon-success animate-spin" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-vireon-surface-subtle flex items-center justify-center border border-white/5">
              <Upload className="w-6 h-6 text-vireon-accent-green" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-vireon-text-primary">
              {uploadMutation.isPending ? uploadProgress : 'Drop files here or click to browse & upload'}
            </p>
            <p className="text-xs text-vireon-text-muted mt-1">
              Supports PDF, Word, Excel, PowerPoint, ZIP, Images - Max 50 MB per file
            </p>
          </div>
        </div>
      </div>

      {/* ── Upload Folder Picker & Search Bar ── */}
      <div className="vireon-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-vireon-accent-green" />
          <label className="text-xs font-semibold text-vireon-text-secondary">Default Upload Folder:</label>
          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value)}
            className="vireon-input py-1.5 text-xs w-56 font-medium">
            {UPLOAD_FOLDERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-vireon-text-muted" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search documents by name, format or tag..."
            className="vireon-input py-1.5 text-xs w-64" />
        </div>
      </div>

      {/* ── Category / Folder Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedFolderFilter('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border',
            selectedFolderFilter === 'all'
              ? 'bg-vireon-accent-green text-white border-vireon-accent-green shadow-sm'
              : 'bg-vireon-surface-subtle text-vireon-text-secondary border-white/5 hover:border-white/20'
          )}>
          All Resources ({folderCounts.all ?? 0})
        </button>
        {UPLOAD_FOLDERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setSelectedFolderFilter(f.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border flex items-center gap-1.5',
              selectedFolderFilter === f.value
                ? 'bg-vireon-accent-green text-white border-vireon-accent-green shadow-sm'
                : 'bg-vireon-surface-subtle text-vireon-text-secondary border-white/5 hover:border-white/20'
            )}>
            <span>{f.label}</span>
            <span className="text-[10px] opacity-80 font-mono">({folderCounts[f.value] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* ── Uploaded Resources Table / Cards ── */}
      <div className="vireon-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-sm font-bold text-vireon-text-primary">
              Uploaded Resources ({filteredFiles.length})
            </h2>
            <span className="text-xs text-vireon-text-muted">
              • Real-time synced with Cloudinary & Mobile
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-vireon-accent-green hover:underline">
            Refresh List
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="vireon-skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-vireon-text-muted">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-vireon-text-primary">No resources found</p>
            <p className="text-xs mt-1">
              {searchQ || selectedFolderFilter !== 'all'
                ? 'No documents match your active filter.'
                : 'Upload PDFs, notes or study materials above to display here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredFiles.map((file) => {
              const meta = getFileTypeDetails(file);
              const FileIcon = meta.icon;
              const uploaderName = typeof file.uploadedBy === 'object' && file.uploadedBy?.fullName
                ? file.uploadedBy.fullName
                : typeof file.uploadedBy === 'object' && file.uploadedBy?.email
                  ? file.uploadedBy.email
                  : 'Official Admin';

              return (
                <motion.div key={file._id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-vireon-accent-green/30 transition-all">
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border', meta.bgColor, meta.borderColor)}>
                    <FileIcon className={cn('w-5 h-5', meta.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-vireon-text-primary truncate">{file.originalName}</p>
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide', meta.bgColor, meta.borderColor, meta.color)}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-vireon-text-muted">
                      <span>{formatBytes(file.bytes)}</span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-vireon-accent-green" />
                        {FOLDER_LABELS[file.folder] ?? file.folder?.split('/').pop()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {uploaderName}
                      </span>
                      <span>{formatDateTime(file.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPreviewUrl(file.secureUrl)}
                      className="vireon-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 hover:border-vireon-accent-green/40">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <a
                      href={file.secureUrl}
                      download={file.originalName}
                      target="_blank"
                      rel="noreferrer"
                      className="vireon-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 bg-green-500/10 border-green-500/20 text-emerald-400 hover:bg-green-500/20">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                    <button
                      disabled={deletingId === file._id}
                      onClick={() => {
                        if (confirm(`Delete "${file.originalName}" permanently from Resources?`)) {
                          deleteMutation.mutate({
                            id: file._id,
                            publicId: file.publicId,
                            resourceType: file.resourceType,
                          });
                        }
                      }}
                      title="Delete Resource"
                      className="p-2 rounded-lg hover:bg-red-500/10 hover:border-red-500/20 text-red-400 hover:text-red-500 border border-transparent transition-all disabled:opacity-50">
                      {deletingId === file._id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Document Preview Modal ── */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-heading font-bold text-white text-sm">Document Preview</h3>
                <div className="flex items-center gap-2">
                  <a href={previewUrl} download target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button onClick={() => setPreviewUrl(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <iframe
                src={previewUrl.toLowerCase().includes('.pdf') || previewUrl.includes('/raw/')
                  ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(previewUrl)}`
                  : previewUrl}
                className="flex-1 w-full border-0 bg-white"
                title="Document Preview"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}