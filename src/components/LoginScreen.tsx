import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Github, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; id: string; provider: string }) => void;
}

// Robust error formatter to prevent rendering empty objects or raw error objects
const formatError = (err: any): string => {
  if (!err) return 'Terjadi kesalahan tidak diketahui.';
  if (typeof err === 'string') return err;
  
  let message = '';
  let details = '';
  let hint = '';
  let code = '';
  let status = '';

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

  if (message) {
    let finalMsg = message;
    if (code) finalMsg += ` (Code: ${code})`;
    if (status) finalMsg += ` (Status: ${status})`;
    if (details) finalMsg += ` - ${details}`;
    if (hint) finalMsg += ` (Hint: ${hint})`;
    return finalMsg;
  }

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
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const supabase = getSupabase();

  // Reset OTP digits and start 5-minute countdown when step changes to OTP
  useEffect(() => {
    if (step === 'otp') {
      setOtpDigits(Array(6).fill(''));
      setTimeLeft(300); // 5 minutes
      
      // Wait for rendering then focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);

      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          'Supabase belum dikonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di pengaturan lingkungan Anda untuk mengirimkan OTP asli.'
        );
      }

      // Real Supabase Auth: signInWithOtp
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (otpError) {
        throw otpError;
      }

      setInfoMessage(`Kode OTP telah dikirim ke ${email}`);
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
    const token = otpDigits.join('').trim();
    if (token.length < 6) {
      setError('Harap masukkan semua 6 digit kode OTP.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          'Supabase belum dikonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di pengaturan lingkungan Anda.'
        );
      }

      // Real Supabase Verification: try 'email' first (standard for email OTP), then fallback to 'signup' or 'magiclink'
      let { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token,
        type: 'email'
      });

      if (verifyError) {
        // Fallback to 'signup' if first attempt fails (newly registered user)
        const { data: signupData, error: signupError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token,
          type: 'signup'
        });

        if (signupError) {
          // Additional fallback to 'magiclink' if both fail
          const { data: magicData, error: magicError } = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: token,
            type: 'magiclink'
          });

          if (magicError) {
            throw verifyError || signupError || magicError;
          } else {
            data = magicData;
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

  const handleResendOtp = async () => {
    if (timeLeft > 0 || loading) return;

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase belum dikonfigurasi.');
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (otpError) throw otpError;

      setInfoMessage(`Kode OTP baru telah dikirim ke ${email}`);
      setTimeLeft(300); // reset countdown
    } catch (err: any) {
      console.error(err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleThirdPartyLogin = async (provider: 'github' | 'google' | 'discord') => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          `Supabase belum dikonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di pengaturan lingkungan Anda untuk masuk dengan ${provider} secara real.`
        );
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

  // 6-digit input navigation helpers
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    const lastChar = cleanVal.substring(cleanVal.length - 1);
    const newDigits = [...otpDigits];
    newDigits[index] = lastChar;
    setOtpDigits(newDigits);

    // Auto focus next input
    if (index < 5 && lastChar) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = Array(6).fill('');
      for (let i = 0; i < pastedData.length; i++) {
        newDigits[i] = pastedData[i];
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s}`;
  };

  // Dynamic state checks for active/bright colors
  const isEmailFilled = email.trim().length > 0;
  const isOtpFilled = !otpDigits.some(d => !d);

  return (
    <div className="min-h-[100dvh] w-full bg-white text-black flex flex-col items-center py-12 px-6 font-sans">
      
      {/* Content wrapper taking up full screen height */}
      <div className="flex-1 flex flex-col w-full max-w-md">
        
        <AnimatePresence mode="wait">
          {step === 'options' && (
            <motion.div 
              key="options"
              className="w-full flex flex-col gap-3 px-2 flex-1 justify-end pb-4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              {/* App logo or branding is centered in the upper screen space */}
              <div className="text-center mb-12 flex-1 flex flex-col items-center justify-center gap-3">
                <img 
                  src="/favicon.png" 
                  alt="DAVECORE AI Logo" 
                  className="w-24 h-24 rounded-full object-cover border border-gray-100 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <h1 className="font-sans text-2xl font-extrabold tracking-widest text-black">DAVECORE AI</h1>
              </div>

              {!isSupabaseConfigured && (
                <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl text-[11px] text-amber-800 font-medium mb-4 text-center leading-relaxed">
                  <p className="font-bold text-xs mb-1">⚠️ Supabase Belum Aktif</p>
                  Autentikasi memerlukan variabel lingkungan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> dan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code>.
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium mb-2 text-center">
                  {error}
                </div>
              )}

              {/* Lanjutkan Dengan email */}
              <button
                onClick={() => {
                  setError(null);
                  setStep('email');
                }}
                disabled={loading}
                className="w-full h-14 bg-black text-white rounded-[20px] hover:bg-neutral-900 active:scale-98 transition-all flex items-center px-6 gap-4 font-semibold text-sm shadow-md cursor-pointer justify-between disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-white" />
                  <span>Lanjutkan Dengan email</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </button>

              {/* Lanjutkan Dengan Github */}
              <button
                onClick={() => handleThirdPartyLogin('github')}
                disabled={loading}
                className="w-full h-14 bg-white text-black border border-gray-200 rounded-[20px] hover:bg-gray-50 active:scale-98 transition-all flex items-center px-6 gap-4 font-semibold text-sm cursor-pointer justify-between disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <Github className="w-5 h-5 text-black" />
                  <span>Lanjutkan Dengan Github</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Lanjutkan Dengan Google */}
              <button
                onClick={() => handleThirdPartyLogin('google')}
                disabled={loading}
                className="w-full h-14 bg-white text-black border border-gray-200 rounded-[20px] hover:bg-gray-50 active:scale-98 transition-all flex items-center px-6 gap-4 font-semibold text-sm cursor-pointer justify-between disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <span className="w-5 h-5 flex items-center justify-center text-black">
                    <i className="fa-brands fa-google text-lg"></i>
                  </span>
                  <span>Lanjutkan Dengan Google</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Lanjutkan Dengan Discord */}
              <button
                onClick={() => handleThirdPartyLogin('discord')}
                disabled={loading}
                className="w-full h-14 bg-white text-black border border-gray-200 rounded-[20px] hover:bg-gray-50 active:scale-98 transition-all flex items-center px-6 gap-4 font-semibold text-sm cursor-pointer justify-between disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <span className="w-5 h-5 flex items-center justify-center text-black">
                    <i className="fa-brands fa-discord text-lg"></i>
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
              className="w-full flex-1 flex flex-col justify-between px-2 pt-2 pb-6 min-h-[60dvh]"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="space-y-12">
                {/* Back button */}
                <div className="-mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep('options');
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all cursor-pointer -ml-2 text-black"
                  >
                    <ChevronLeft className="w-6 h-6 text-black" />
                  </button>
                </div>

                <div className="space-y-6">
                  <h2 className="text-[28px] sm:text-3xl font-extrabold text-black tracking-tight font-sans leading-tight">
                    Masukkan alamat email
                  </h2>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium text-center">
                      {error}
                    </div>
                  )}

                  <input
                    type="email"
                    placeholder="Alamat email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 px-5 rounded-2xl bg-[#f4f4f5] text-black placeholder-gray-400 focus:outline-none focus:bg-gray-100/90 focus:ring-0 text-base font-medium transition-all"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Action Button: Bright/Vibrant pink if filled, pale/pastel pink if empty */}
              <div className="pt-12">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-14 font-bold rounded-full shadow-md text-sm cursor-pointer flex items-center justify-center transition-all ${
                    isEmailFilled 
                      ? 'bg-[#ff3b5c] hover:bg-[#ff1e43] text-white active:scale-98' 
                      : 'bg-[#ffadb9] text-white/90 opacity-80 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim...</span>
                    </div>
                  ) : (
                    <span>Lanjutkan</span>
                  )}
                </button>
              </div>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.form 
              key="otp"
              onSubmit={handleOtpVerify}
              className="w-full flex-1 flex flex-col justify-between px-2 pt-2 pb-6 min-h-[60dvh]"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="space-y-12">
                {/* Back button */}
                <div className="-mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep('email');
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all cursor-pointer -ml-2 text-black"
                  >
                    <ChevronLeft className="w-6 h-6 text-black" />
                  </button>
                </div>

                <div className="space-y-6">
                  <h2 className="text-[28px] sm:text-3xl font-extrabold text-black tracking-tight font-sans leading-tight">
                    Masukkan kode verifikasi
                  </h2>

                  {infoMessage && (
                    <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-[11px] text-green-800 leading-relaxed font-medium">
                      {infoMessage}
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium text-center">
                      {error}
                    </div>
                  )}

                  {/* 6 separate box-by-box OTP inputs with auto focus jumps */}
                  <div className="flex items-center justify-between gap-1 w-full max-w-sm mx-auto py-4">
                    {Array(6).fill(null).map((_, idx) => (
                      <React.Fragment key={idx}>
                        <input
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={otpDigits[idx]}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="flex-1 aspect-square max-w-[48px] bg-gray-100 text-center font-bold text-lg sm:text-xl text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffadb9] focus:bg-white transition-all border border-transparent focus:border-transparent"
                          required
                          autoFocus={idx === 0}
                          disabled={loading}
                        />
                        {idx < 5 && (
                          <span className="text-gray-300 font-bold select-none text-xs sm:text-sm">-</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Expiration countdown and resend button */}
                  <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
                    <div className="text-sm font-semibold text-gray-500 font-sans">
                      Waktu kadaluarsa: <span className="font-mono text-black font-bold">{formatTime(timeLeft)}</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={timeLeft > 0 || loading}
                      className={`text-xs font-bold transition-all px-4 py-2 rounded-full border ${
                        timeLeft === 0 && !loading
                          ? 'border-gray-300 text-black hover:bg-gray-50 active:scale-98 cursor-pointer'
                          : 'border-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      Kirim ulang code
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Button: Bright/Vibrant pink if fully filled, pale/pastel pink if incomplete */}
              <div className="pt-12">
                <button
                  type="submit"
                  disabled={loading || !isOtpFilled}
                  className={`w-full h-14 font-bold rounded-full shadow-md text-sm cursor-pointer flex items-center justify-center transition-all ${
                    isOtpFilled 
                      ? 'bg-[#ff3b5c] hover:bg-[#ff1e43] text-white active:scale-98' 
                      : 'bg-[#ffadb9] text-white/90 opacity-80 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi...</span>
                    </div>
                  ) : (
                    <span>Lanjutkan</span>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="text-[11px] text-gray-400 font-mono tracking-wider text-center">
      </div>
    </div>
  );
}
