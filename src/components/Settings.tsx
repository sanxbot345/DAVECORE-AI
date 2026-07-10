import React, { useState, useEffect } from 'react';
import { ArrowLeft, Vibrate, AlertCircle, Check, Settings as SettingsIcon, X, Brain, Trash2, Plus, LogOut, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  user: { email: string; id: string; provider: string } | null;
  onLogout: () => void;
  storagePrefix: string;
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
  user,
  onLogout,
  storagePrefix
}: SettingsProps) {
  const s = getSettingsTranslations(appLang);

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
      {user && (
        <div className="bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/10 dark:to-indigo-950/10 border border-purple-100/50 dark:border-purple-900/20 rounded-3xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold font-serif text-sm">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">Akun Aktif</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 truncate">{user.email}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Metode masuk: <strong className="capitalize">{user.provider}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Brain AI Memory Bank Section (PRO FEATURE) */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-xl">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-serif text-[15px] md:text-[16px] font-bold text-gray-900 dark:text-zinc-100">Memory</h3>
          </div>
        </div>

        {/* List of Memories */}
        {memories.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {memories.map((mem, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50/60 dark:bg-zinc-800/40 rounded-xl border border-gray-100/50 dark:border-zinc-800/50 text-xs"
              >
                <span className="text-gray-700 dark:text-zinc-300 font-medium pl-1 leading-relaxed">{mem}</span>
                <button
                  onClick={() => {
                    triggerHaptic();
                    onDeleteMemory(index);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Hapus memori ini"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
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
