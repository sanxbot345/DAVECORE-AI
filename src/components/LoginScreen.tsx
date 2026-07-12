import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Github, ArrowRight } from 'lucide-react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; id: string; provider: string }) => void;
}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabase();

  const handleThirdPartyLogin = async (provider: 'github' | 'google' | 'discord') => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          `Supabase belum dikonfigurasi. Harap tentukan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di pengaturan lingkungan Anda untuk masuk dengan ${provider} secara real.`
        );
      }

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
    <div className="min-h-[100dvh] w-full bg-white text-black flex flex-col items-center py-12 px-6 font-sans">
      <div className="flex-1 flex flex-col w-full max-w-md justify-between">
        <div className="text-center mt-12 flex-1 flex flex-col items-center justify-center gap-3">
          <img 
            src="/logo.png" 
            alt="DAVECORE AI Logo" 
            className="w-40 h-40 object-contain"
            referrerPolicy="no-referrer"
          />
          <h1 className="font-sans text-2xl font-extrabold tracking-widest text-black">DAVECORE AI</h1>
        </div>

        <motion.div 
          className="w-full flex flex-col gap-3 px-2 pb-8"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
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
      </div>
    </div>
  );
}
