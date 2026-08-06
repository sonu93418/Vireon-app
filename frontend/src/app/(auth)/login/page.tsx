'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import apiClient from '@/lib/api-client';
import type { Metadata } from 'next';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginResponse {
  success: boolean;
  data: {
    user: { _id: string; fullName: string; email: string; phone: string; role: string; avatarUrl?: string; isEmailVerified: boolean; status: string };
    tokens: { accessToken: string; refreshToken: string };
  };
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const res = await apiClient.post<LoginResponse>('/auth/login/email', data);
      return res.data;
    },
    onSuccess: (data) => {
      const { user, tokens } = data.data;
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        setError('root', { message: 'Access denied. Admin credentials required.' });
        return;
      }
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error?.response?.data?.message ?? 'Login failed. Please try again.';
      setError('root', { message });
    },
  });

  const onSubmit = (data: LoginFormData) => loginMutation.mutate(data);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-vireon-bg">
      {/* Radial Glow Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-vireon-accent-green/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl" />
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-vireon-accent-green/10 border border-vireon-accent-green/30 mb-4 shadow-glow-green">
            <Shield className="w-8 h-8 text-vireon-success" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-vireon-text-primary mb-1">
            Vireon Admin
          </h1>
          <p className="text-vireon-text-muted text-sm">
            Industrial Safety Institute — Enterprise Dashboard
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="vireon-badge-green text-[10px]">Govt. Registered</span>
            <span className="vireon-badge-green text-[10px]">ISO 45001</span>
            <span className="vireon-badge-green text-[10px]">Secure Portal</span>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="gradient-border"
        >
          <div className="vireon-card p-8">
            <h2 className="font-heading text-xl font-semibold text-vireon-text-primary mb-1">
              Sign In
            </h2>
            <p className="text-sm text-vireon-text-muted mb-6">
              Access restricted to authorized administrators only
            </p>

            {/* Root Error */}
            {errors.root && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-sm text-red-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errors.root.message}
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-vireon-text-secondary mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@vireonsafety.in"
                  className={`vireon-input ${errors.email ? 'border-red-500/50 focus:border-red-500/70' : ''}`}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-vireon-text-secondary mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`vireon-input pr-10 ${errors.password ? 'border-red-500/50 focus:border-red-500/70' : ''}`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vireon-text-muted hover:text-vireon-text-primary transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loginMutation.isPending}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="vireon-btn-primary w-full justify-center py-3 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                id="login-submit-btn"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Sign In to Admin Panel
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-xs text-vireon-text-muted">
                🔒 256-bit SSL encrypted • RBAC protected
              </p>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-vireon-text-muted mt-6"
        >
          © {new Date().getFullYear()} Vireon Safety Institute. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}
