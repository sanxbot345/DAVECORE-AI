import React, { useState, useEffect } from 'react';
import { ArrowLeft, Vibrate, AlertCircle, Check, Settings as SettingsIcon, X, Brain, Trash2, Plus, LogOut, ShieldAlert, Camera, Globe, Sparkles, Cpu, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from '../lib/supabase';

const GRADIENTS = [
  { id: 'gradient:purple', label: 'Lavender Violet', class: 'bg-gradient-to-tr from-purple-500 to-indigo-500 text-white' },
  { id: 'gradient:teal', label: 'Teal Mint', class: 'bg-gradient-to-tr from-teal-500 to-emerald-500 text-white' },
  { id: 'gradient:blue', label: 'Ocean Blue', class: 'bg-gradient-to-tr from-blue-500 to-cyan-500 text-white' },
  { id: 'gradient:orange', label: 'Sunset Orange', class: 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white' },
  { id: 'gradient:pink', label: 'Rose Pink', class: 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white' },
  { id: 'gradient:emerald', label: 'Forest Green', class: 'bg-gradient-to-tr from-emerald-500 to-green-600 text-white' },
];

const EMOJIS = ['🦊', '🐱', '🐻', '🦁', '🐼', '🐨', '🐙', '🦄', '🚀', '🤖', '💻', '🧠', '👽', '🎨', '🎭', '🎮', '⭐️', '🍀'];

interface SettingsProps {
  onBack: () => void;
  chatSessionsCount: number;
  totalMessagesCount: number;
  onClearHistory: () => void;
  theme: 'Sistem' | 'Terang' | 'Gelap';
  setTheme: (t: 'Sistem' | 'Terang' | 'Gelap') => void;
  appLang: string;
  setAppLang: (lang: string) => void;
  memories: string[];
  onAddMemory: (memory: string) => void;
  onDeleteMemory: (index: number) => void;
  onSetMemories?: (m: string[]) => void;
  user: { email: string; id: string; provider: string } | null;
  onLogout: () => void;
  storagePrefix: string;
  userName: string;
  onSaveUserName: (name: string) => void;
  supabaseError?: string | null;
  onSetSupabaseError?: (err: string | null) => void;
  aiModel?: string;
  setAiModel?: (model: string) => void;
}

const getSettingsTranslations = (lang: string) => {
  const l = (lang || '').toLowerCase();
  if (l.includes('indonesia')) {
    return {
      title: "Setelan",
      theme: "Tema",
      appLang: "Bahasa aplikasi",
      haptic: "Umpan balik haptik",
      storageTitle: "Penyimpanan & Privasi",
      storageDesc: "Semua riwayat chat Anda diisolasi secara aman sesuai akun aktif demi perlindungan privasi penuh.",
      totalSessions: "Total Sesi",
      totalMessages: "Total Pesan",
      deleteTitle: "Hapus Seluruh Riwayat Chat",
      deleteDesc: "Tindakan ini akan menghapus semua pesan dan file lampiran dari akun ini secara permanen. Tindakan tidak dapat dibatalkan.",
      deleteBtn: "Hapus Semua Riwayat Chat",
      confirmTitle: "Apakah Anda sangat yakin?",
      yesDelete: "Ya, Hapus Permanen",
      cancel: "Batal",
      successMsg: "Riwayat chat berhasil dihapus secara permanen!",
      backTitle: "Kembali",
      sessionsUnit: "Sesi",
      messagesUnit: "Pesan"
    };
  }
  return {
    title: "Settings",
    theme: "Theme",
    appLang: "App language",
    haptic: "Haptic feedback",
    storageTitle: "Storage & Privacy",
    storageDesc: "All your chat history is securely isolated based on the active account for full privacy protection.",
    totalSessions: "Total Sessions",
    totalMessages: "Total Messages",
    deleteTitle: "Delete All Chat History",
    deleteDesc: "This action will permanently delete all messages and attachments from this account. This action cannot be undone.",
    deleteBtn: "Delete All Chat History",
    confirmTitle: "Are you absolutely sure?",
    yesDelete: "Yes, Permanently Delete",
    cancel: "Cancel",
    successMsg: "Chat history cleared successfully!",
    backTitle: "Back",
    sessionsUnit: "Sessions",
    messagesUnit: "Messages"
  };
};

export default function Settings({
  onBack,
  chatSessionsCount,
  totalMessagesCount,
  onClearHistory,
  theme,
  setTheme,
  appLang,
  setAppLang,
  memories,
  onAddMemory,
  onDeleteMemory,
  onSetMemories,
  user,
  onLogout,
  storagePrefix,
  userName,
  onSaveUserName,
  supabaseError,
  onSetSupabaseError,
  aiModel,
  setAiModel
}: SettingsProps) {
  const s = getSettingsTranslations(appLang);

  const [localUserName, setLocalUserName] = useState(userName);

  // Sync localUserName when parent userName changes
  useEffect(() => {
    setLocalUserName(userName);
  }, [userName]);

  const [hapticFeedback, setHapticFeedback] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`davecore_haptic_${storagePrefix}`);
      return saved !== 'false'; // default to true
    } catch (e) {
      return true;
    }
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSqlInstructions, setShowSqlInstructions] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  
  // Custom Avatar profile selection
  const [avatar, setAvatar] = useState<string>(() => {
    try {
      return localStorage.getItem(`davecore_profile_avatar_${storagePrefix}`) || 'gradient:purple';
    } catch (e) {
      return 'gradient:purple';
    }
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // Persist avatar preference
  useEffect(() => {
    try {
      localStorage.setItem(`davecore_profile_avatar_${storagePrefix}`, avatar);
    } catch (e) {
      console.error('Error saving avatar:', e);
    }
  }, [avatar, storagePrefix]);

  const [toneStyle, setToneStyle] = useState<string>(() => {
    try {
      return localStorage.getItem(`davecore_tone_style_${storagePrefix}`) || 'Standar';
    } catch (e) {
      return 'Standar';
    }
  });

  const [customInstructions, setCustomInstructions] = useState<string>(() => {
    try {
      return localStorage.getItem(`davecore_custom_instructions_${storagePrefix}`) || '';
    } catch (e) {
      return '';
    }
  });

  const [typedPlaceholder, setTypedPlaceholder] = useState("");

  useEffect(() => {
    const fullPlaceholder = "Bagikan hal lain yg perlu di pertimbangkan DAVECORE AI dalam responsnya.";
    let index = 0;
    const interval = setInterval(() => {
      setTypedPlaceholder(fullPlaceholder.slice(0, index + 1));
      index++;
      if (index >= fullPlaceholder.length) {
        clearInterval(interval);
      }
    }, 25); // 25ms per character for an ultra-smooth typing effect
    return () => clearInterval(interval);
  }, []);

  // Sync profile & personalization changes with Local Storage and Supabase database
  useEffect(() => {
    try {
      localStorage.setItem(`davecore_tone_style_${storagePrefix}`, toneStyle);
      localStorage.setItem(`davecore_custom_instructions_${storagePrefix}`, customInstructions);
    } catch (e) {
      console.error('Error saving personalization state:', e);
    }

    const syncToDatabase = async () => {
      const supabase = getSupabase();
      if (supabase && user) {
        try {
          const profileData: any = {
            id: user.id,
            email: user.email,
            provider: user.provider || 'email',
            username: userName,
            avatar: avatar,
            custom_instructions: customInstructions,
            tone_style: toneStyle,
            updated_at: new Date().toISOString()
          };

          if (memories) {
            profileData.memories = memories;
          }

          const { error: upsertError } = await supabase
            .from('user_profiles')
            .upsert(profileData, { onConflict: 'id' });

          if (upsertError) {
            // Gracefully handle missing memories column (PG code 42703)
            if (upsertError.code === '42703' || upsertError.message?.includes('memories') || upsertError.message?.includes('column')) {
              console.warn('Supabase: column "memories" missing in user_profiles table. Retrying without it...');
              delete profileData.memories;
              await supabase
                .from('user_profiles')
                .upsert(profileData, { onConflict: 'id' });
            } else {
              throw upsertError;
            }
          }
        } catch (err) {
          console.error('Failed to sync profile to Supabase:', err);
        }
      }
    };

    // Use debouncing for saving during typing
    const timer = setTimeout(() => {
      syncToDatabase();
    }, 400);

    return () => clearTimeout(timer);
  }, [toneStyle, customInstructions, avatar, user, storagePrefix, userName, memories]);

  // Load personalization from database if logged in
  useEffect(() => {
    const loadProfileFromDb = async () => {
      const supabase = getSupabase();
      if (supabase && user) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) {
            console.warn('Supabase: unable to load user profile (tables may not be created yet):', error);
            if (
              error.code === '42P01' || 
              error.message?.includes('relation') || 
              error.message?.includes('does not exist') || 
              error.message?.includes('schema cache') || 
              error.message?.includes('Could not find') || 
              error.message?.includes('table')
            ) {
              onSetSupabaseError?.('missing_tables');
            }
          } else if (data) {
            if (data.avatar) setAvatar(data.avatar);
            if (data.tone_style) setToneStyle(data.tone_style);
            if (data.custom_instructions) setCustomInstructions(data.custom_instructions);
            if (data.username) {
              onSaveUserName(data.username);
              setLocalUserName(data.username);
            }
            if (data.memories && Array.isArray(data.memories)) {
              onSetMemories?.(data.memories);
            }
            
            localStorage.setItem(`davecore_profile_avatar_${storagePrefix}`, data.avatar || 'gradient:purple');
            localStorage.setItem(`davecore_tone_style_${storagePrefix}`, data.tone_style || 'Standar');
            localStorage.setItem(`davecore_custom_instructions_${storagePrefix}`, data.custom_instructions || '');
            if (data.memories && Array.isArray(data.memories)) {
              localStorage.setItem(`davecore_memories_${storagePrefix}`, JSON.stringify(data.memories));
            }
            if (data.username) {
              localStorage.setItem(`davecore_username_${storagePrefix}`, data.username);
            }
          }
        } catch (err) {
          console.warn('Supabase: exception while loading user profile:', err);
        }
      }
    };

    loadProfileFromDb();
  }, [user, storagePrefix]);

  // Sync haptic load when active account prefix changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`davecore_haptic_${storagePrefix}`);
      setHapticFeedback(saved !== 'false');
    } catch (e) {
      setHapticFeedback(true);
    }
  }, [storagePrefix]);

  useEffect(() => {
    try {
      localStorage.setItem(`davecore_haptic_${storagePrefix}`, String(hapticFeedback));
    } catch (e) {
      console.error(e);
    }
    if (hapticFeedback && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
  }, [hapticFeedback, storagePrefix]);

  const handleClearHistory = () => {
    setDeleteSuccess(true);
    setConfirmDelete(false);
    onClearHistory();
    setTimeout(() => {
      setDeleteSuccess(false);
    }, 2000);
  };

  const triggerHaptic = () => {
    if (hapticFeedback && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryInput.trim()) return;
    onAddMemory(newMemoryInput.trim());
    setNewMemoryInput('');
    triggerHaptic();
  };

  const renderAvatar = (sizeClass = "w-11 h-11 text-[20px]") => {
    const email = user ? user.email : 'Guest';
    const initial = email.charAt(0).toUpperCase();
    if (avatar.startsWith('emoji:')) {
      const emoji = avatar.replace('emoji:', '');
      const hasTextSize = sizeClass.includes('text-');
      return (
        <div className={`${sizeClass} rounded-full bg-purple-50 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/30 flex items-center justify-center select-none shrink-0 shadow-sm ${!hasTextSize ? 'text-[20px]' : ''}`}>
          <span className="leading-none">{emoji}</span>
        </div>
      );
    }
    if (avatar.startsWith('url:')) {
      const url = avatar.replace('url:', '');
      return (
        <img 
          src={url} 
          alt="Profile Avatar" 
          className={`${sizeClass} rounded-full object-cover border border-purple-100/80 dark:border-purple-900/40 shrink-0 shadow-sm`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${email}`;
          }}
        />
      );
    }
    // Gradients
    const matched = GRADIENTS.find(g => g.id === avatar);
    const gradientClass = matched ? matched.class : 'bg-gradient-to-tr from-purple-500 to-indigo-500 text-white';
    return (
      <div className={`${sizeClass} rounded-full ${gradientClass} flex items-center justify-center font-bold font-serif shadow-sm shrink-0`}>
        {initial}
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-10 flex flex-col h-full overflow-y-auto select-none">
      
      {/* Header with back button, settings icon, and Logout */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic();
              onBack();
            }}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="flex items-center gap-1.5">
            <SettingsIcon size={18} className="text-gray-700 dark:text-zinc-300 shrink-0" />
            <h1 className="font-serif text-lg font-bold text-gray-900 dark:text-zinc-50">{s.title}</h1>
          </div>
        </div>

        {/* User Account Details & Logout */}
        {user && (
          <button
            onClick={() => {
              triggerHaptic();
              setShowLogoutConfirm(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-950/40 bg-red-50/20 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold transition-all cursor-pointer"
            title="Keluar dari akun Anda"
          >
            <LogOut size={13} />
            <span>Keluar</span>
          </button>
        )}
      </div>

      {/* User Session Info Card */}
      <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/10 dark:to-indigo-950/10 border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-3.5">
          
          {/* Interactive Customizable Avatar */}
          <button
            onClick={() => {
              triggerHaptic();
              setShowAvatarPicker(true);
            }}
            className="relative group cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400/80 shrink-0 transition-transform active:scale-95"
            title="Ganti Foto Profil"
          >
            {renderAvatar("w-12 h-12 text-base")}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold">
              <Camera size={12} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-800 p-0.5 rounded-full border border-gray-100 dark:border-zinc-750 shadow-sm flex items-center justify-center">
              <Camera size={8} className="text-gray-500 dark:text-gray-400" />
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">
              {user ? "Akun Aktif" : "Profil Tamu"}
            </p>
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-extrabold text-gray-950 dark:text-zinc-50 truncate" title={userName || "Pengguna"}>
                {userName || "Pengguna"}
              </p>
            </div>
            <div className="flex items-center gap-1 min-w-0 mt-0.5">
              <p className="text-xs text-gray-500 dark:text-zinc-400 truncate" title={user ? user.email : "Guest User (Offline)"}>
                {user ? user.email : "Guest User (Offline)"}
              </p>
              {user && (
                <i className="fa-solid fa-circle-check text-blue-500 text-[12px] shrink-0" title="Verified Account"></i>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-gray-400">
                Metode masuk: <strong className="capitalize text-purple-600 dark:text-purple-400 font-bold">
                  {user ? (user.provider || "email") : "Tamu (Lokal)"}
                </strong>
              </p>
              <span className="text-gray-300 dark:text-zinc-700 text-[9px]">•</span>
              <button 
                onClick={() => { triggerHaptic(); setShowAvatarPicker(true); }}
                className="text-[10px] font-bold text-purple-500 hover:underline cursor-pointer"
              >
                Ubah Profil
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Schema Missing Warning */}
      {supabaseError === 'missing_tables' && (
        <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-900/40 rounded-[24px] p-5 mb-6">
          <div className="flex gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl h-fit">
              <ShieldAlert size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-serif text-sm font-bold text-amber-800 dark:text-amber-400">
                Tabel Supabase Belum Dibuat
              </h4>
              <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1 leading-relaxed">
                Supabase berhasil terhubung, tetapi tabel <strong>user_profiles</strong> atau <strong>chat_history</strong> tidak ditemukan. Jalankan perintah SQL schema untuk mengaktifkan sinkronisasi profil & riwayat chat.
              </p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowSqlInstructions(!showSqlInstructions);
                  }}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                >
                  {showSqlInstructions ? 'Sembunyikan SQL' : 'Lihat Perintah SQL'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    const sqlCode = `-- SQL Schema untuk Supabase\n\n-- 1. Tabel Profil\nCREATE TABLE IF NOT EXISTS public.user_profiles (\n    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,\n    email TEXT NOT NULL,\n    provider TEXT DEFAULT 'email',\n    username TEXT DEFAULT '',\n    avatar TEXT DEFAULT 'gradient:purple',\n    custom_instructions TEXT DEFAULT '',\n    tone_style TEXT DEFAULT 'Standar',\n    memories JSONB DEFAULT '[]'::jsonb,\n    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\nALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Pengguna dapat mengelola profil mereka sendiri" ON public.user_profiles\n    FOR ALL USING (auth.uid() = id);\n\n-- JIKA TABEL SUDAH ADA, JALANKAN INI UNTUK MENAMBAHKAN KOLOM MEMORI:\n-- ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS memories JSONB DEFAULT '[]'::jsonb;\n\n-- 2. Tabel Riwayat Chat\nCREATE TABLE IF NOT EXISTS public.chat_history (\n    id TEXT PRIMARY KEY,\n    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,\n    title TEXT NOT NULL,\n    messages JSONB NOT NULL DEFAULT '[]'::jsonb,\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,\n    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\nALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Pengguna dapat mengelola riwayat chat mereka sendiri" ON public.chat_history\n    FOR ALL USING (auth.uid() = user_id);`;
                    navigator.clipboard.writeText(sqlCode);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  {copiedSql ? (
                    <>
                      <Check size={12} /> Tersalin!
                    </>
                  ) : (
                    'Salin Schema SQL'
                  )}
                </button>
              </div>

              {showSqlInstructions && (
                <div className="mt-3 bg-white/60 dark:bg-zinc-950/50 rounded-xl p-3 border border-amber-200/30 dark:border-amber-900/20 max-h-[160px] overflow-y-auto font-mono text-[10px] text-gray-600 dark:text-zinc-400 leading-normal scrollbar-thin">
                  <pre className="whitespace-pre">{`-- 1. Tabel Profil Pengguna
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    provider TEXT DEFAULT 'email',
    username TEXT DEFAULT '',
    avatar TEXT DEFAULT 'gradient:purple',
    custom_instructions TEXT DEFAULT '',
    tone_style TEXT DEFAULT 'Standar',
    memories JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna dapat mengelola profil mereka sendiri" 
    ON public.user_profiles FOR ALL USING (auth.uid() = id);

-- JIKA TABEL SUDAH ADA, JALANKAN INI UNTUK MENAMBAHKAN KOLOM MEMORI:
-- ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS memories JSONB DEFAULT '[]'::jsonb;

-- 2. Tabel Riwayat Chat
CREATE TABLE IF NOT EXISTS public.chat_history (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pengguna dapat mengelola riwayat chat mereka sendiri" 
    ON public.chat_history FOR ALL USING (auth.uid() = user_id);`}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supabase Generic Connection Error Warning */}
      {supabaseError && supabaseError !== 'missing_tables' && (
        <div className="bg-red-50/50 dark:bg-red-950/15 border border-red-200/60 dark:border-red-900/40 rounded-[24px] p-5 mb-6">
          <div className="flex gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl h-fit">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-serif text-sm font-bold text-red-800 dark:text-red-400">
                Gagal Menghubungkan Supabase
              </h4>
              <p className="text-xs text-red-700/80 dark:text-red-500/80 mt-1 leading-relaxed">
                Terjadi kesalahan saat berkomunikasi dengan database: <span className="font-mono text-[11px] bg-red-100/50 dark:bg-red-950/50 px-1.5 py-0.5 rounded text-red-900 dark:text-red-300 font-bold">{supabaseError}</span>. Riwayat Anda disimpan secara lokal untuk sementara waktu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Personalization Section */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-[28px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.01)] mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center w-9 h-9">
            <i className="fa-solid fa-sliders text-base"></i>
          </div>
          <div>
            <h3 className="font-serif text-[15px] md:text-[16px] font-bold text-gray-900 dark:text-zinc-100">Personalisasi AI</h3>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed">
              Atur bagaimana DAVECORE merespons, memilih nada bicara, dan mengikuti instruksi spesifik Anda.
            </p>
          </div>
        </div>

        {/* Gaya dan Nada Dasar */}
        <div className="space-y-2.5 mb-5">
          <label className="block text-[12px] font-semibold text-gray-700 dark:text-zinc-300">
            Gaya dan Nada Dasar
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Standar', 'Kasual', 'Profesional', 'Ringkas', 'Kreatif', 'Akademis'].map((style) => {
              const isActive = toneStyle === style;
              return (
                <button
                  key={style}
                  onClick={() => {
                    triggerHaptic();
                    setToneStyle(style);
                  }}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                    isActive
                      ? 'bg-purple-600 text-white border-purple-600 dark:bg-purple-500 dark:border-purple-500 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-100 text-gray-700 dark:bg-zinc-850 dark:hover:bg-zinc-805 dark:border-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>

        {/* Instruksi Khusus */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[12px] font-semibold text-gray-700 dark:text-zinc-300">
              Instruksi Khusus
            </label>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500">
              {customInstructions.length}/500 karakter
            </span>
          </div>
          <textarea
            value={customInstructions}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setCustomInstructions(e.target.value);
              }
            }}
            placeholder={typedPlaceholder}
            className="w-full h-24 p-3 text-xs md:text-sm bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 dark:bg-zinc-850 dark:border-zinc-800 dark:text-zinc-100 resize-none leading-relaxed placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
        </div>
      </div>



      {/* App Prefs Card (Haptics, etc.) */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.01)] mb-6 p-2">
        
        {/* Row: Umpan balik haptik */}
        <div className="w-full flex items-center justify-between p-4 rounded-2xl">
          <div className="flex items-center gap-4">
            <span className="text-[14px] md:text-[15px] font-semibold text-gray-900 dark:text-zinc-100">{s.haptic}</span>
          </div>
          
          {/* Custom Toggle Switch */}
          <button
            onClick={() => {
              setHapticFeedback(!hapticFeedback);
              if (!hapticFeedback && window.navigator && window.navigator.vibrate) {
                setTimeout(() => window.navigator.vibrate(30), 50);
              }
            }}
            className={`w-[48px] h-[28px] rounded-full p-[2px] transition-colors duration-300 outline-none flex items-center cursor-pointer ${
              hapticFeedback ? 'bg-teal-600 dark:bg-teal-500' : 'bg-gray-200 dark:bg-zinc-700'
            }`}
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-[24px] h-[24px] rounded-full bg-white shadow-md"
              style={{
                marginLeft: hapticFeedback ? '20px' : '0px'
              }}
            />
          </button>
        </div>
      </div>

      {/* Advanced Settings: Clean Borderless Chat Storage Management */}
      <div className="bg-transparent space-y-6 pt-4 pb-12">
        <div className="px-4">
          <h3 className="font-serif text-[17px] font-bold text-gray-900 dark:text-zinc-100 mb-1">{s.storageTitle}</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
            {s.storageDesc}
          </p>
        </div>

        {/* Storage stats */}
        <div className="grid grid-cols-2 gap-4 px-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100/80 dark:border-zinc-800/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <span className="block text-[10px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">{s.totalSessions}</span>
            <span className="text-[15px] font-bold text-gray-800 dark:text-zinc-200">{chatSessionsCount} {s.sessionsUnit}</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-100/80 dark:border-zinc-800/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <span className="block text-[10px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">{s.totalMessages}</span>
            <span className="text-[15px] font-bold text-gray-800 dark:text-zinc-200">{totalMessagesCount} {s.messagesUnit}</span>
          </div>
        </div>

        {/* Warning and Delete Button */}
        <div className="mx-4 border border-red-100/60 dark:border-red-950/40 bg-red-50/30 dark:bg-red-950/10 p-5 rounded-2xl space-y-4">
          <div className="flex gap-3 items-start text-red-700 dark:text-red-400">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="block text-xs font-bold">{s.deleteTitle}</span>
              <p className="text-[11px] text-red-600 dark:text-red-400/80 leading-relaxed">
                {s.deleteDesc}
              </p>
            </div>
          </div>

          <div className="pt-1">
            {deleteSuccess ? (
              <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 py-2.5 px-3 rounded-xl justify-center">
                <Check size={14} />
                <span>{s.successMsg}</span>
              </div>
            ) : !confirmDelete ? (
              <button
                onClick={() => {
                  triggerHaptic();
                  setConfirmDelete(true);
                }}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/15 dark:hover:bg-red-950/30 border border-red-100 dark:border-red-950 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                {s.deleteBtn}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-red-700 dark:text-red-400 text-center">
                  {s.confirmTitle}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      triggerHaptic();
                      handleClearHistory();
                    }}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {s.yesDelete}
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic();
                      setConfirmDelete(false);
                    }}
                    className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    {s.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Avatar Selection Modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.23, ease: 'easeOut' }}
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-5 md:p-6 rounded-[28px] shadow-2xl max-w-md w-full max-h-[85vh] md:max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800/80 shrink-0">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                    Ubah Foto Profil / Avatar
                  </h3>
                </div>
                <button
                  onClick={() => { triggerHaptic(); setShowAvatarPicker(false); }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Current Preview - Designed nicely with a light card container */}
              <div className="flex flex-col items-center justify-center gap-1.5 py-4 shrink-0 bg-gray-50/50 dark:bg-zinc-850/30 border border-gray-100/30 dark:border-zinc-800/20 rounded-2xl my-4">
                <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Pratinjau</p>
                {renderAvatar("w-16 h-16 text-xl")}
              </div>

              {/* Options - Scrollable area */}
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                {/* 1. Gradients */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" />
                    Warna Gradien (Inisial)
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {GRADIENTS.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          triggerHaptic();
                          setAvatar(g.id);
                        }}
                        className={`aspect-square rounded-full ${g.class} flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          avatar === g.id ? 'border-purple-600 dark:border-purple-500 scale-105 shadow-md' : 'border-transparent hover:scale-105'
                        } cursor-pointer`}
                        title={g.label}
                      >
                        {user ? user.email.charAt(0).toUpperCase() : 'U'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Emojis */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Karakter Emoji
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {EMOJIS.map((emo) => {
                      const id = `emoji:${emo}`;
                      return (
                        <button
                          key={emo}
                          onClick={() => {
                            triggerHaptic();
                            setAvatar(id);
                          }}
                          className={`aspect-square rounded-full bg-gray-50 dark:bg-zinc-850 flex items-center justify-center text-[19px] border-2 transition-all ${
                            avatar === id ? 'border-purple-600 dark:border-purple-500 scale-105 shadow-md' : 'border-transparent hover:scale-105'
                          } cursor-pointer`}
                        >
                          {emo}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Image URL */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Globe size={11} className="text-blue-500" />
                    Tautan Gambar Kustom (URL)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="Tempel tautan gambar... (https://...)"
                      className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        if (customUrl.trim().startsWith('http')) {
                          setAvatar(`url:${customUrl.trim()}`);
                          setCustomUrl('');
                        }
                      }}
                      disabled={!customUrl.trim().startsWith('http')}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shrink-0 transition-all active:scale-95"
                    >
                      Gunakan
                    </button>
                  </div>
                </div>

                {/* 4. Username / Nama Panggilan */}
                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800/45">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    Nama Panggilan / Username
                  </p>
                  <input
                    type="text"
                    value={localUserName}
                    onChange={(e) => setLocalUserName(e.target.value)}
                    placeholder="Masukkan nama panggilan Anda..."
                    className="w-full px-3 py-2 text-xs md:text-sm bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-850 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 font-semibold transition-all"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    if (localUserName.trim()) {
                      onSaveUserName(localUserName.trim());
                    }
                    setShowAvatarPicker(false);
                  }}
                  disabled={!localUserName.trim()}
                  className="w-full px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Dialog Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-zinc-900 border border-gray-200/50 dark:border-zinc-800 p-6 md:p-8 rounded-[28px] shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-zinc-100 font-sans">
                Apakah Anda Yakin
              </h3>
              
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowLogoutConfirm(false);
                  }}
                  className="flex-1 py-3 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 rounded-[200px] text-xs font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Tidak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowLogoutConfirm(false);
                    onLogout();
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-[200px] text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
