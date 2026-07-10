import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Github, MessageSquare, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; id: string; provider: string }) => void;
}

// Robust error formatter to prevent rendering empty objects or raw error objects
const formatError = (err: any): string => {
  if (!err) return 'Terjadi kesalahan tidak diketahui.';
  if (typeof err === 'string') return err;
  
  // Extract all readable fields from the error object
  let message = '';
  let details = '';
  let hint = '';
  let code = '';
  let status = '';

  // 1. Direct checks on standard error fields
  if (typeof err === 'object') {
    if (err.message && typeof err.message === 'string') {
      message = err.message;
    }
    if (err.error_description && typeof err.error_description === 'string') {
      message = err.error_description;
    }
    if (err.error && typeof err.error === 'string') {
      message = err.error;
    } else if (err.error && typeof err.error === 'object') {
      if (err.error.message && typeof err.error.message === 'string') {
        message = err.error.message;
      }
    }
    if (err.details && typeof err.details === 'string') {
      details = err.details;
    }
    if (err.hint && typeof err.hint === 'string') {
      hint = err.hint;
    }
    if (err.code && typeof err.code === 'string') {
      code = err.code;
    }
    if (err.status !== undefined) {
      status = String(err.status);
    }
  }

  // 2. Reflective checks for non-enumerable properties (e.g. if the object inherits from Error but isn't detected as an instance)
  try {
    const props = Object.getOwnPropertyNames(err);
    for (const prop of props) {
      if (!message && prop === 'message' && typeof err[prop] === 'string') {
        message = err[prop];
      }
      if (!details && prop === 'details' && typeof err[prop] === 'string') {
        details = err[prop];
      }
      if (!hint && prop === 'hint' && typeof err[prop] === 'string') {
        hint = err[prop];
      }
      if (!code && prop === 'code' && typeof err[prop] === 'string') {
        code = err[prop];
      }
      if (!status && prop === 'status' && err[prop] !== undefined) {
        status = String(err[prop]);
      }
    }
  } catch (e) {
    // Ignore reflection errors
  }

  // If we found a message, return it with details
  if (message) {
    let finalMsg = message;
    if (code) finalMsg += ` (Code: ${code})`;
    if (status) finalMsg += ` (Status: ${status})`;
    if (details) finalMsg += ` - ${details}`;
    if (hint) finalMsg += ` (Hint: ${hint})`;
    return finalMsg;
  }

  // If no message was found, serialize the object properties so we don't just output "{}"
  try {
    const allProps: any = {};
    const props = Object.getOwnPropertyNames(err);
    for (const prop of props) {
      if (typeof err[prop] !== 'function' && prop !== 'stack') {
        allProps[prop] = err[prop];
      }
    }
    
    const str = JSON.stringify(allProps, null, 2);
    if (str === '{}') {
      return `Error: ${String(err)}`;
    }
    return str;
  } catch (e) {
    return 'Terjadi kesalahan tidak diketahui: ' + String(err);
  }
};

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
        setInfoMessage(`[MODE SIMULASI] Kode OTP simulasi dikirim ke ${email}. Gunakan kode 123456 untuk masuk.`);
        setStep('otp');
        setLoading(false);
        return;
      }

      // Real Supabase Auth: signInWithOtp
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (otpError) {
        throw otpError; // Let the catch block format it
      }

      setInfoMessage(`Kode OTP asli telah dikirim ke ${email}`);
      setStep('otp');
    } catch (err: any) {
      console.error(err);
      setError(formatError(err));
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
        if (otp.trim() === '123456') {
          onLoginSuccess({
            email: email.trim(),
            id: `simulated_${email.trim().replace(/[^a-zA-Z0-9]/g, '_')}`,
            provider: 'simulated'
          });
        } else {
          throw new Error('Kode OTP simulasi salah! Harap gunakan kode 123456.');
        }
        setLoading(false);
        return;
      }

      // Real Supabase Verification: try 'magiclink' first, then 'signup' fallback for new users
      let { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'magiclink'
      });

      if (verifyError) {
        // Fallback to 'signup' if first attempt fails (newly registered user)
        const { data: signupData, error: signupError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: 'signup'
        });

        if (signupError) {
          // Additional fallback to 'email' if both fail (some client or server configurations)
          const { data: emailData, error: emailError } = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: otp.trim(),
            type: 'email' as any
          });

          if (emailError) {
            // Throw verifyError or signupError or emailError
            throw verifyError || signupError || emailError;
          } else {
            data = emailData;
          }
        } else {
          data = signupData;
        }
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
      setError(formatError(err));
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
        onLoginSuccess({
          email: `${provider}_user@example.com`,
          id: `simulated_${provider}_user`,
          provider: provider
        });
        setLoading(false);
        return;
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
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white text-black flex flex-col items-center justify-between py-12 px-6 font-sans">
      
      {/* Spacer to align content to the bottom */}
      <div className="flex-1 flex flex-col items-center justify-end w-full max-w-md pb-6">
        
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
      </div>
    </div>
  );
}
