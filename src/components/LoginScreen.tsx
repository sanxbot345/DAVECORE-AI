import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Github, MessageSquare, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; id: string; provider: string }) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [step, setStep] = useState<'options' | 'email' | 'otp'>('options');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const supabase = getSupabase();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase belum dikonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di pengaturan lingkungan Anda.');
      }

      // Real Supabase Auth: signInWithOtp
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (otpError) {
        throw new Error(otpError.message);
      }

      setInfoMessage(`Kode OTP asli telah dikirim ke ${email}`);
      setStep('otp');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengirim kode OTP. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase belum dikonfigurasi.');
      }

      // Real Supabase Verification
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email'
      });

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      if (data?.user) {
        onLoginSuccess({
          email: data.user.email || email,
          id: data.user.id,
          provider: 'email'
        });
      } else {
        throw new Error('Gagal mendapatkan informasi user.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verifikasi OTP gagal.');
    } finally {
      setLoading(false);
    }
  };

  // Real OAuth login for third-party providers (Github / Discord)
  const handleThirdPartyLogin = async (provider: 'github' | 'discord') => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase belum dikonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di pengaturan lingkungan Anda.');
      }

      // Real Supabase OAuth signin
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (authError) throw authError;
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Gagal masuk dengan ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white text-black flex flex-col items-center justify-between py-12 px-6 font-sans">
      
      {!isSupabaseConfigured && (
        <div className="w-full max-w-md bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs text-amber-800 flex items-start gap-2.5 shadow-sm">
          <span className="text-amber-500 font-bold shrink-0">⚠️ PERINGATAN</span>
          <div>
            <p className="font-semibold mb-0.5">Sistem Autentikasi Real-Time Aktif</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              Aplikasi dikonfigurasi untuk menggunakan mode real-time murni (tanpa simulasi). Harap konfigurasikan variabel lingkungan <strong className="underline">VITE_SUPABASE_URL</strong> dan <strong className="underline">VITE_SUPABASE_ANON_KEY</strong> untuk mengaktifkan fungsionalitas login real-time Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Spacer to align center content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        
        {/* Centered Logo container */}
        <div className="flex flex-col items-center">
          {/* Stunning Glowing Neural AI Core Logo */}
          <div className="relative animate-[float_4s_ease-in-out_infinite]">
            {/* Soft glowing ambient circle behind logo */}
            <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full scale-75" />
            
            <svg className="w-28 h-28 relative z-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ai-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="ai-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="50%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <linearGradient id="ai-grad-secondary" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
                <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Ambient background glow */}
              <circle cx="100" cy="100" r="80" fill="url(#ai-glow)" />

              {/* Outer Processing Ring with Cyber Nodes */}
              <circle cx="100" cy="100" r="70" stroke="url(#ai-grad-primary)" strokeWidth="1.5" strokeDasharray="12 6 4 6" className="animate-[spin_40s_linear_infinite]" opacity="0.6" />
              <circle cx="100" cy="100" r="58" stroke="url(#ai-grad-secondary)" strokeWidth="1" strokeDasharray="5 10" className="animate-[spin_20s_linear_infinite_reverse]" opacity="0.4" />

              {/* Tech Circuit Pins (Floating AI bits) */}
              <g opacity="0.8">
                <circle cx="100" cy="20" r="3" fill="#60A5FA" />
                <line x1="100" y1="20" x2="100" y2="35" stroke="#60A5FA" strokeWidth="1.5" />
                <circle cx="100" cy="180" r="3" fill="#8B5CF6" />
                <line x1="100" y1="180" x2="100" y2="165" stroke="#8B5CF6" strokeWidth="1.5" />
                <circle cx="20" cy="100" r="3" fill="#34D399" />
                <line x1="20" y1="100" x2="35" y2="100" stroke="#34D399" strokeWidth="1.5" />
                <circle cx="180" cy="100" r="3" fill="#EC4899" />
                <line x1="180" y1="100" x2="165" y2="100" stroke="#EC4899" strokeWidth="1.5" />
              </g>

              {/* Core Glowing Neural AI Brain Shape */}
              <g filter="url(#glow-effect)">
                {/* Left hemisphere brain curves */}
                <path 
                  d="M 100,60 C 85,55 60,65 60,85 C 60,100 70,105 70,115 C 70,125 60,130 65,140 C 70,150 90,145 100,135" 
                  stroke="url(#ai-grad-primary)" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Right hemisphere brain curves */}
                <path 
                  d="M 100,60 C 115,55 140,65 140,85 C 140,100 130,105 130,115 C 130,125 140,130 135,140 C 130,150 110,145 100,135" 
                  stroke="url(#ai-grad-primary)" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  fill="none"
                />
              </g>

              {/* Neural Network Nodes and Synaptic Connections */}
              <g>
                {/* Central core node */}
                <circle cx="100" cy="100" r="6" fill="#FFFFFF" filter="url(#glow-effect)" />
                <circle cx="100" cy="100" r="4" fill="#8B5CF6" />

                {/* Surrounding synaptic nodes */}
                <circle cx="75" cy="80" r="3" fill="#60A5FA" />
                <circle cx="125" cy="80" r="3" fill="#60A5FA" />
                <circle cx="75" cy="120" r="3" fill="#EC4899" />
                <circle cx="125" cy="120" r="3" fill="#EC4899" />
                <circle cx="100" cy="72" r="3" fill="#34D399" />
                <circle cx="100" cy="128" r="3" fill="#34D399" />

                {/* Inter-connections */}
                <line x1="100" y1="100" x2="75" y2="80" stroke="#60A5FA" strokeWidth="0.75" opacity="0.6" />
                <line x1="100" y1="100" x2="125" y2="80" stroke="#60A5FA" strokeWidth="0.75" opacity="0.6" />
                <line x1="100" y1="100" x2="75" y2="120" stroke="#EC4899" strokeWidth="0.75" opacity="0.6" />
                <line x1="100" y1="100" x2="125" y2="120" stroke="#EC4899" strokeWidth="0.75" opacity="0.6" />
                <line x1="100" y1="100" x2="100" y2="72" stroke="#34D399" strokeWidth="0.75" opacity="0.6" />
                <line x1="100" y1="100" x2="100" y2="128" stroke="#34D399" strokeWidth="0.75" opacity="0.6" />

                <line x1="75" y1="80" x2="100" y2="72" stroke="#60A5FA" strokeWidth="0.5" opacity="0.4" />
                <line x1="125" y1="80" x2="100" y2="72" stroke="#60A5FA" strokeWidth="0.5" opacity="0.4" />
                <line x1="75" y1="120" x2="100" y2="128" stroke="#EC4899" strokeWidth="0.5" opacity="0.4" />
                <line x1="125" y1="120" x2="100" y2="128" stroke="#EC4899" strokeWidth="0.5" opacity="0.4" />
              </g>

              {/* Sparkling logic pulses */}
              <circle cx="85" cy="95" r="1.5" fill="#FFFFFF" className="animate-ping" style={{ animationDuration: '3s' }} />
              <circle cx="115" cy="95" r="1.5" fill="#FFFFFF" className="animate-ping" style={{ animationDuration: '2.5s' }} />
            </svg>
          </div>

          {/* Small grey dot below the logo exactly as in the photo */}
          <div className="w-2.5 h-2.5 bg-gray-200 rounded-full mt-5 mb-12" />
        </div>

        {/* Dynamic step transitions */}
        <AnimatePresence mode="wait">
          {step === 'options' && (
            <motion.div 
              key="options"
              className="w-full flex flex-col gap-3 px-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium mb-2 text-center">
                  {error}
                </div>
              )}

              {/* Lanjutkan Dengan email (Primary Button - black background, white text) */}
              <button
                onClick={() => {
                  setError(null);
                  setStep('email');
                }}
                disabled={loading}
                className="w-full h-14 bg-black text-white rounded-[20px] hover:bg-neutral-900 active:scale-98 transition-all flex items-center px-6 gap-4 font-semibold text-sm shadow-md cursor-pointer justify-between"
              >
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-white" />
                  <span>Lanjutkan Dengan email</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </button>

              {/* Lanjutkan Dengan Github (White background, thin border, black text) */}
              <button
                onClick={() => handleThirdPartyLogin('github')}
                disabled={loading}
                className="w-full h-14 bg-white text-black border border-gray-200 rounded-[20px] hover:bg-gray-50 active:scale-98 transition-all flex items-center px-6 gap-4 font-semibold text-sm cursor-pointer justify-between"
              >
                <div className="flex items-center gap-4">
                  <Github className="w-5 h-5 text-black" />
                  <span>Lanjutkan Dengan Github</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Lanjutkan Dengan Discord (White background, thin border, black text) */}
              <button
                onClick={() => handleThirdPartyLogin('discord')}
                disabled={loading}
                className="w-full h-14 bg-white text-black border border-gray-200 rounded-[20px] hover:bg-gray-50 active:scale-98 transition-all flex items-center px-6 gap-4 font-semibold text-sm cursor-pointer justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="w-5 h-5 flex items-center justify-center text-black">
                    <i className="fa-brands fa-discord text-xl"></i>
                  </span>
                  <span>Lanjutkan Dengan Discord</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            </motion.div>
          )}

          {step === 'email' && (
            <motion.form 
              key="email"
              onSubmit={handleEmailSubmit}
              className="w-full flex flex-col gap-4 px-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-1">Masuk dengan Email</h3>
                <p className="text-xs text-gray-500">Kami akan mengirimkan kode verifikasi OTP ke alamat email Anda.</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1">Alamat Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-13 px-4 rounded-[16px] border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-medium"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('options')}
                  disabled={loading}
                  className="flex-1 h-12 border border-gray-200 text-gray-600 rounded-[16px] text-xs font-bold hover:bg-gray-50 active:scale-98 transition-all cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 bg-black text-white rounded-[16px] text-xs font-bold hover:bg-neutral-900 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.form 
              key="otp"
              onSubmit={handleOtpVerify}
              className="w-full flex flex-col gap-4 px-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-1">Verifikasi Kode OTP</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Kami telah mengirimkan 6 digit kode OTP ke <span className="font-semibold text-gray-800 break-all">{email}</span>.
                </p>
              </div>

              {infoMessage && (
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-[11px] text-purple-800 leading-relaxed font-medium">
                  {infoMessage}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Kode Verifikasi OTP</span>
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-13 px-4 rounded-[16px] border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-center tracking-[0.5em] font-mono text-lg font-bold"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep('email');
                  }}
                  disabled={loading}
                  className="flex-1 h-12 border border-gray-200 text-gray-600 rounded-[16px] text-xs font-bold hover:bg-gray-50 active:scale-98 transition-all cursor-pointer"
                >
                  Ubah Email
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 bg-black text-white rounded-[16px] text-xs font-bold hover:bg-neutral-900 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Footer credits or simple link */}
      <div className="text-[11px] text-gray-400 font-mono tracking-wider text-center">
        DAVECORE SECURE AUTHENTICATION SYSTEM
      </div>
    </div>
  );
}
