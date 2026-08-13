'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, ShieldCheck, AlertCircle, Loader2, Mail, KeyRound,
  Lock, Sparkles, CheckCircle2, Check, UserCheck, Radio, Server, Shield
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import apiClient from '@/lib/api-client';

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

  useEffect(() => {
    // Prefetch dashboard route bundle immediately
    router.prefetch('/dashboard');
  }, [router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const watchedEmail = watch('email');
  const isValidEmailFormat = watchedEmail && z.string().email().safeParse(watchedEmail).success;

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const res = await apiClient.post<LoginResponse>('/auth/login/email', data);
      return res.data;
    },
    onSuccess: (data) => {
      const { user, tokens } = data.data;
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        setError('root', { message: 'Access denied. Super Admin credentials required.' });
        return;
      }
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      router.push('/dashboard');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message = error?.response?.data?.message ?? 'Authentication failed. Please verify credentials.';
      setError('root', { message });
    },
  });

  const onSubmit = (data: LoginFormData) => loginMutation.mutate(data);

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden flex flex-col items-center justify-center relative bg-[#064E3B] p-3 sm:p-5 select-none">
      {/* ── Solid Green Background & Custom Geometric Design Overlay ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Custom Geometric Diamond Isometric Pattern SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="geometric-mesh" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M40 0 L80 40 L40 80 L0 40 Z" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
              <path d="M0 0 L80 80 M80 0 L0 80" fill="none" stroke="#FFFFFF" strokeWidth="0.75" />
              <circle cx="40" cy="40" r="3.5" fill="#FFFFFF" />
              <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
              <circle cx="80" cy="0" r="2.5" fill="#FFFFFF" />
              <circle cx="80" cy="80" r="2.5" fill="#FFFFFF" />
              <circle cx="0" cy="80" r="2.5" fill="#FFFFFF" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geometric-mesh)" />
        </svg>

        {/* Geometric Sharp Polygon Accents in Background */}
        <div className="absolute -top-16 -left-16 w-80 h-80 border-4 border-emerald-400/15 rotate-45 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 border-4 border-emerald-400/15 rotate-12 pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-64 h-64 border-2 border-emerald-300/10 rotate-45 pointer-events-none" />
        <div className="absolute bottom-1/3 -left-20 w-56 h-56 border-2 border-emerald-300/10 rotate-12 pointer-events-none" />
      </div>

      <div className="w-full max-w-4xl relative z-10 my-auto flex flex-col items-center">
        {/* ── Top Standalone 3D Title (Replicating User Reference: White Face + Emerald 3D Extrusion Block) ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-2 sm:mb-4 flex flex-col items-center select-none"
        >
          {/* Big Size VIREON Text (6XL) with 100% Solid Pure White Front Face & Emerald 3D Extrusion Sides */}
          <h1
            style={{
              color: '#FFFFFF',
              textShadow:
                '1px 1px 0px #34d399, 2px 2px 0px #10b981, 3px 3px 0px #059669, 4px 4px 0px #059669, 5px 5px 0px #047857, 6px 6px 0px #047857, 7px 7px 0px #065f46, 8px 8px 0px #022c22, 9px 11px 18px rgba(0,0,0,0.75)',
            }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-[0.3em] uppercase text-white pl-[0.3em] py-0.5 flex items-center justify-center gap-0.5 filter drop-shadow-lg"
          >
            {['V', 'I', 'R', 'E', 'O', 'N'].map((char, idx) => (
              <motion.span
                key={idx}
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: idx * 0.18,
                  ease: 'easeInOut',
                }}
                className="inline-block text-white"
                style={{ color: '#FFFFFF' }}
              >
                {char}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle: VIREON CONSOLE */}
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <p className="text-xs sm:text-sm font-mono font-black tracking-[0.35em] uppercase text-emerald-100">
              VIREON CONSOLE
            </p>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>
        </motion.div>

        {/* ── Single 3D Rectangle Card Container (Client Delivery Ready) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <div className="clay-card bg-white border-4 border-emerald-600 shadow-[0_25px_60px_rgba(0,0,0,0.5),inset_0_3px_6px_rgba(255,255,255,1)] rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 relative min-h-[440px]">

            {/* ── LEFT PANEL: Professional Super Admin Form Panel ── */}
            <div className="md:col-span-6 bg-gradient-to-b from-[#064E3B] via-[#043E2F] to-[#022A20] text-white p-6 sm:p-8 flex flex-col justify-between relative border-b-4 md:border-b-0 md:border-r-4 border-emerald-600">

              {/* Top Bar: Brand Logo & Title */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#08120e] border border-emerald-400/80 p-0.5 shadow-md flex items-center justify-center relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logo.png"
                      alt="Vireon Safety Logo"
                      className="w-full h-full object-contain object-center"
                    />
                  </div>
                  <div>
                    <p className="font-heading text-xs sm:text-sm font-black text-white leading-tight">Vireon Safety</p>
                    <p className="text-[9px] sm:text-[10px] text-emerald-300 font-bold">Industrial Safety Institute</p>
                  </div>
                </div>

                <span className="text-[9px] sm:text-[10px] font-black text-emerald-100 uppercase tracking-widest bg-emerald-800/90 border border-emerald-500/80 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  <Shield className="w-3.5 h-3.5 text-emerald-300" /> Super Admin
                </span>
              </div>

              {/* Form Title & Inputs */}
              <div>
                <div className="text-left mb-4">
                  <h1 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight">
                    LOGIN
                  </h1>
                  <p className="text-emerald-200 text-xs font-extrabold tracking-wider uppercase mt-0.5">
                    VIREON CONSOLE
                  </p>
                </div>

                {/* Root Error Message */}
                {errors.root && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 bg-rose-900/80 border border-rose-400 rounded-xl p-2.5 mb-3.5 text-[11px] text-rose-100 font-bold shadow-sm"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-300" />
                    {errors.root.message}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                  {/* Email Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="email" className="block text-[10px] sm:text-[11px] font-extrabold text-emerald-100 uppercase tracking-wider">
                        Super Admin Email
                      </label>
                      {isValidEmailFormat && (
                        <span className="text-[9px] font-bold text-emerald-300 flex items-center gap-0.5">
                          <Check className="w-3 h-3 text-emerald-400" /> Valid Format
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="admin@vireonsafety.in"
                        className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-2 border-emerald-400/50 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all shadow-inner ${errors.email ? 'border-rose-400' : ''
                          }`}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-[10px] text-rose-300 font-semibold mt-0.5">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password" className="block text-[10px] sm:text-[11px] font-extrabold text-emerald-100 uppercase tracking-wider">
                        Password
                      </label>
                      <span className="text-[9px] font-semibold text-emerald-200">
                        {showPassword ? '👁️ Visible' : '🔒 Masked'}
                      </span>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter password"
                        className={`w-full pl-9 pr-9 py-2.5 text-xs font-semibold rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-2 border-emerald-400/50 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all shadow-inner ${errors.password ? 'border-rose-400' : ''
                          }`}
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-[10px] text-rose-300 font-semibold mt-0.5">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Solid 3D Tactile Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loginMutation.isPending}
                    whileHover={{ scale: 1.01, translateY: -1 }}
                    whileTap={{ scale: 0.98, translateY: 1 }}
                    className="w-full justify-center py-3 mt-2 font-black text-xs sm:text-sm uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-[0_8px_16px_rgba(0,0,0,0.3)] border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 disabled:opacity-60 cursor-pointer transition-all flex items-center gap-2"
                    id="login-submit-btn"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authenticating Portal Access...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Sign In to Admin Portal
                      </>
                    )}
                  </motion.button>
                </form>
              </div>

              {/* Left Panel Footer */}
              <div className="mt-4 pt-3 border-t border-emerald-700/60 text-center">
                <p className="text-[9px] sm:text-[10px] text-emerald-200 font-bold flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-300" /> 256-Bit SSL Protection • Enterprise Security Scope
                </p>
              </div>
            </div>

            {/* ── RIGHT PANEL: Edge-to-Edge 3D Professional Admin Office Photo ── */}
            <div className="md:col-span-6 bg-white p-2 sm:p-3 flex items-center justify-center relative overflow-hidden h-full min-h-[350px]">

              {/* High-Resolution Office Photo - Edge-to-Edge Frame Fit */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white border border-emerald-200/80 shadow-md flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/admin_office.jpg"
                  alt="Vireon Industrial Safety Super Admin"
                  className="w-full h-full object-cover object-center scale-[1.02]"
                />
              </div>

            </div>
          </div>
        </motion.div>

        {/* Footer Copyright */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-[10px] text-emerald-100 font-bold mt-2.5"
        >
          © {new Date().getFullYear()} Vireon Safety Institute. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
}



