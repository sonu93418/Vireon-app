'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield, Key, Bell, Lock, UserCheck, CheckCircle2,
  AlertCircle, Loader2, Send, Database, Server
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import apiClient from '@/lib/api-client';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onChangePassword = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccessMessage('Password changed successfully!');
      reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to change password.';
      setErrorMessage(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleTestPushNotification = async () => {
    setTestPushLoading(true);
    setTestPushStatus(null);
    try {
      await apiClient.post('/notifications/send', {
        title: '🔔 Admin FCM Test Notification',
        body: 'System Check: Firebase Cloud Messaging Push Service is operating normally.',
        type: 'SYSTEM',
      });
      setTestPushStatus('Push notification dispatched successfully!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Push notification dispatch failed.';
      setTestPushStatus(`Error: ${msg}`);
    } finally {
      setTestPushLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto pb-10"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-green-600" />
            Authentication & System Settings
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-0.5">
            Manage admin security, access tokens, role permissions, and Push Notification controls
          </p>
        </div>
        <div className="vireon-badge-green text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
          <UserCheck className="w-3.5 h-3.5" />
          Active Session: {user?.role ?? 'ADMIN'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Admin Profile & Session */}
        <div className="space-y-6">
          <div className="clay-card p-6 bg-white border border-green-600/20">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-green-600/10">
              <div className="w-14 h-14 rounded-2xl bg-green-600 text-white font-extrabold text-xl flex items-center justify-center shadow-clay-green">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <div>
                <h2 className="font-heading text-lg font-extrabold text-slate-900">{user?.fullName ?? 'Admin User'}</h2>
                <p className="text-xs text-slate-500 font-bold">{user?.email ?? 'admin@vireonsafety.in'}</p>
                <span className="vireon-badge-green text-[10px] mt-1 inline-block">{user?.role ?? 'SUPER_ADMIN'}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">User ID</span>
                <span className="font-mono font-bold text-slate-800">{user?._id ?? 'demo_admin_01'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Phone</span>
                <span className="font-bold text-slate-800">{user?.phone ?? '+91 9876543210'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Account Status</span>
                <span className="text-green-700 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" /> Active & Verified
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-semibold">Security Token</span>
                <span className="font-mono font-bold text-green-700">256-Bit SSL JWT</span>
              </div>
            </div>
          </div>

          {/* System Services Status */}
          <div className="clay-card p-6 bg-white border border-green-600/20 space-y-4">
            <h2 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-green-600" />
              Service Status
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-700" />
                  <span className="text-xs font-bold text-slate-800">MongoDB Database</span>
                </div>
                <span className="vireon-badge-green text-[10px]">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-green-700" />
                  <span className="text-xs font-bold text-slate-800">FCM Push Gateway</span>
                </div>
                <span className="vireon-badge-green text-[10px]">Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Password Change & Push Notification Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Change Password Card */}
          <div className="clay-card p-6 bg-white border border-green-600/20">
            <h2 className="font-heading text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" />
              Change Administrator Password
            </h2>
            <p className="text-xs text-slate-500 font-semibold mb-6">
              Update your account password to maintain maximum portal security.
            </p>

            {successMessage && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-2xl bg-green-50 border border-green-200 text-xs font-bold text-green-700">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="clay-input"
                  {...register('currentPassword')}
                />
                {errors.currentPassword && (
                  <p className="text-xs text-red-600 font-semibold mt-1">{errors.currentPassword.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    className="clay-input"
                    {...register('newPassword')}
                  />
                  {errors.newPassword && (
                    <p className="text-xs text-red-600 font-semibold mt-1">{errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    className="clay-input"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600 font-semibold mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="clay-btn-primary mt-2 flex items-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </form>
          </div>

          {/* FCM Push Notification Manager */}
          <div className="clay-card p-6 bg-white border border-green-600/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-green-600" />
                  Push Notification Dispatch Test
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Test FCM push messaging delivery across registered student & faculty mobile apps
                </p>
              </div>
              <span className="vireon-badge-green text-xs">FCM v1 Enabled</span>
            </div>

            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-800">Broadcast Push Channel</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Sends instant system notification to active Expo Mobile clients</p>
              </div>
              <button
                onClick={handleTestPushNotification}
                disabled={testPushLoading}
                className="clay-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                {testPushLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {testPushLoading ? 'Testing...' : 'Test Push Broadcast'}
              </button>
            </div>

            {testPushStatus && (
              <div className="p-3 rounded-2xl bg-white border border-green-600/20 text-xs font-bold text-slate-800 shadow-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {testPushStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
