'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Video, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface UploadResponse {
  data: {
    publicId: string;
    secureUrl: string;
    format: string;
    bytes: number;
    resourceType: 'image' | 'video' | 'raw';
  };
}

interface FileUploadProps {
  type?: 'image' | 'pdf' | 'video' | 'document';
  folder?: string;
  value?: string;
  onChange: (url: string, publicId?: string) => void;
  onRemove?: () => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export function FileUpload({
  type = 'image',
  folder = 'vireon/gallery',
  value,
  onChange,
  onRemove,
  label,
  accept = 'image/*',
  maxSizeMB = 10,
  className,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const endpointMap = {
    image: '/upload/image',
    pdf: '/upload/pdf',
    video: '/upload/video',
    document: '/upload/document',
  };

  const handleFile = async (file: File) => {
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File size exceeds ${maxSizeMB} MB limit.`);
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      const response = await apiClient.post<UploadResponse>(endpointMap[type], formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
      });

      const { secureUrl, publicId } = response.data.data;
      onChange(secureUrl, publicId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = async () => {
    if (onRemove) onRemove();
    onChange('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>}

      {value ? (
        <div className="relative group rounded-2xl border border-emerald-500/20 bg-white p-3.5 flex items-center justify-between shadow-clay">
          <div className="flex items-center gap-3 min-w-0">
            {type === 'image' ? (
              <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-emerald-500/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : type === 'pdf' ? (
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                <FileText className="w-5 h-5" />
              </div>
            ) : type === 'video' ? (
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Video className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{value.split('/').pop()}</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Uploaded to Cloudinary
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2',
            isDragging
              ? 'border-emerald-500 bg-emerald-50 scale-[1.01]'
              : 'border-emerald-500/20 hover:border-emerald-500/50 bg-[#F8FAF9] hover:bg-white shadow-clay-inset'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-500 font-semibold">Uploading... {progress}%</p>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Click to upload or drag & drop
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Max size: {maxSizeMB} MB ({type.toUpperCase()})
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 font-semibold mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
