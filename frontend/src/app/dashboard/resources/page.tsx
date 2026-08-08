'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useCallback } from 'react';
import {
  FileText, Upload, Download, Eye, Trash2, Search,
  FolderOpen, Tag, Loader2, X
} from 'lucide-react';
import apiClient from '@/lib/api-client';
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
  uploadedBy?: { fullName?: string; email?: string };
}

const FOLDERS = [
  { value: 'vireon/syllabus', label: 'Course Syllabus' },
  { value: 'vireon/study_materials', label: 'Study Materials' },
  { value: 'vireon/certificates', label: 'Certificates & Templates' },
  { value: 'vireon/forms', label: 'Admission Forms' },
  { value: 'vireon/safety_docs', label: 'Safety Documentation' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function ResourcesPage() {
  const [uploadFolder, setUploadFolder] = useState('vireon/syllabus');
  const [searchQ, setSearchQ] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['uploads', 'my'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UploadedFile[] }>('/upload/my');
      return res.data;
    },
    refetchInterval: 60000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress('Uploading ' + file.name + ' to Cloudinary...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', uploadFolder);

      const endpoint = file.type === 'application/pdf'
        ? '/upload/pdf'
        : file.type.startsWith('image/')
          ? '/upload/image'
          : '/upload/document';

      const res = await apiClient.post<{ data: UploadedFile }>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: (uploaded) => {
      void queryClient.invalidateQueries({ queryKey: ['uploads'] });
      setUploadProgress('');
      void apiClient.post('/notifications/send', {
        title: 'New Study Material: ' + uploaded.originalName,
        body: 'A new document ' + uploaded.originalName + ' has been uploaded. Open the app to view and download.',
        type: 'COURSE_UPDATE',
      }).catch(() => {});
    },
    onError: () => setUploadProgress(''),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ publicId, resourceType }: { publicId: string; resourceType: string }) => {
      const type = resourceType === 'image' ? 'image' : 'raw';
      await apiClient.delete('/upload/' + encodeURIComponent(publicId) + '?type=' + type);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['uploads'] }),
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

  const filteredFiles = (data?.data ?? []).filter((f) =>
    f.originalName.toLowerCase().includes(searchQ.toLowerCase()) ||
    f.folder?.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Study Resources & PDFs</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">
            Upload PDFs & documents - Auto-uploads to Cloudinary - Students can view & download
          </p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="vireon-btn-primary" id="upload-resource-btn">
          <Upload className="w-4 h-4" /> Upload File
        </button>
        <input ref={fileInputRef} type="file" className="hidden" multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg"
          onChange={(e) => handleFiles(e.target.files)} />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-vireon-success bg-green-50 scale-[1.01]'
            : 'border-white/10 hover:border-vireon-accent-green/40 hover:bg-white/[0.02]'
        )}>
        <div className="flex flex-col items-center gap-3">
          {uploadMutation.isPending ? (
            <Loader2 className="w-10 h-10 text-vireon-success animate-spin" />
          ) : (
            <FileText className="w-10 h-10 text-vireon-text-muted" />
          )}
          <div>
            <p className="text-sm font-semibold text-vireon-text-primary">
              {uploadMutation.isPending ? uploadProgress : 'Drop files here or click to browse'}
            </p>
            <p className="text-xs text-vireon-text-muted mt-1">
              PDF, Word, Excel, PowerPoint, ZIP, Images - Max 50 MB
            </p>
          </div>
        </div>
      </div>

      <div className="vireon-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-vireon-text-muted" />
          <label className="text-xs font-medium text-vireon-text-secondary">Upload to Folder:</label>
          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value)}
            className="vireon-input py-1.5 text-xs w-48">
            {FOLDERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Search className="w-4 h-4 text-vireon-text-muted" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search files..."
            className="vireon-input py-1.5 text-xs w-48" />
        </div>
      </div>

      <div className="vireon-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-sm font-bold text-vireon-text-primary">
            Uploaded Files ({filteredFiles.length})
          </h2>
          <span className="text-xs text-vireon-text-muted">All files stored on Cloudinary</span>
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
            <p className="text-sm font-medium">No files uploaded yet</p>
            <p className="text-xs mt-1">Upload PDFs and documents above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <motion.div key={file._id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-vireon-accent-green/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-vireon-text-primary truncate">{file.originalName}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-vireon-text-muted">
                    <span>{formatBytes(file.bytes)}</span>
                    <span className="uppercase font-bold">{file.format || file.mimeType?.split('/').pop()}</span>
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{file.folder?.split('/').pop()}</span>
                    <span>{formatDateTime(file.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={file.secureUrl} target="_blank" rel="noreferrer"
                    onClick={() => setPreviewUrl(file.secureUrl)}
                    className="vireon-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> View
                  </a>
                  <a href={file.secureUrl} download={file.originalName}
                    className="vireon-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button
                    onClick={() => {
                      if (confirm('Delete ' + file.originalName + '?')) {
                        deleteMutation.mutate({ publicId: file.publicId, resourceType: file.resourceType });
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 hover:border-red-200 text-red-400 hover:text-red-600 border border-transparent transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-heading font-bold text-slate-900 text-sm">Document Preview</h3>
                <div className="flex items-center gap-2">
                  <a href={previewUrl} download
                    className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button onClick={() => setPreviewUrl(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <iframe
                src={previewUrl.toLowerCase().includes('.pdf') || previewUrl.includes('/raw/')
                  ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(previewUrl)}`
                  : previewUrl}
                className="flex-1 w-full border-0"
                title="Document Preview"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}