import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sun, Globe, Vibrate, ChevronRight, AlertCircle, Check, Settings as SettingsIcon, Search, X } from 'lucide-react';
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
}

const POPULAR_LANGUAGES = [
  { code: 'id', name: 'Bahasa Indonesia', nativeName: 'Indonesia' },
  { code: 'en', name: 'English', nativeName: 'United States / UK' },
  { code: 'es', name: 'Español', nativeName: 'Spanish' },
  { code: 'fr', name: 'Français', nativeName: 'French' },
  { code: 'de', name: 'Deutsch', nativeName: 'German' },
  { code: 'it', name: 'Italiano', nativeName: 'Italian' },
  { code: 'pt', name: 'Português', nativeName: 'Portuguese' },
  { code: 'nl', name: 'Nederlands', nativeName: 'Dutch' },
  { code: 'ru', name: 'Русский', nativeName: 'Russian' },
  { code: 'zh', name: '中文 (简体)', nativeName: 'Simplified Chinese' },
  { code: 'zt', name: '繁體中文', nativeName: 'Traditional Chinese' },
  { code: 'ja', name: '日本語', nativeName: 'Japanese' },
  { code: 'ko', name: '한국어', nativeName: 'Korean' },
  { code: 'ar', name: 'العربية', nativeName: 'Arabic' },
  { code: 'tr', name: 'Türkçe', nativeName: 'Turkish' },
  { code: 'vi', name: 'Tiếng Việt', nativeName: 'Vietnamese' },
  { code: 'th', name: 'ไทย', nativeName: 'Thai' },
  { code: 'pl', name: 'Polski', nativeName: 'Polish' },
  { code: 'sv', name: 'Svenska', nativeName: 'Swedish' },
  { code: 'no', name: 'Norsk', nativeName: 'Norwegian' },
  { code: 'da', name: 'Dansk', nativeName: 'Danish' },
  { code: 'fi', name: 'Suomi', nativeName: 'Finnish' },
  { code: 'cs', name: 'Čeština', nativeName: 'Czech' },
  { code: 'el', name: 'Ελληνικά', nativeName: 'Greek' },
  { code: 'hu', name: 'Magyar', nativeName: 'Hungarian' },
  { code: 'ro', name: 'Română', nativeName: 'Romanian' },
  { code: 'sk', name: 'Slovenčina', nativeName: 'Slovak' },
  { code: 'uk', name: 'Українська', nativeName: 'Ukrainian' },
  { code: 'ms', name: 'Melayu', nativeName: 'Malay' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Filipino' },
  { code: 'hi', name: 'हिन्दी', nativeName: 'Hindi' },
  { code: 'bn', name: 'বাংলা', nativeName: 'Bengali' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', nativeName: 'Punjabi' },
  { code: 'gu', name: 'ગુજરાતી', nativeName: 'Gujarati' },
  { code: 'ta', name: 'தமிழ்', nativeName: 'Tamil' },
  { code: 'te', name: 'తెలుగు', nativeName: 'Telugu' },
  { code: 'kn', name: 'ಕನ್ನಡ', nativeName: 'Kannada' },
  { code: 'ml', name: 'മലയാളം', nativeName: 'Malayalam' },
  { code: 'mr', name: 'मराठी', nativeName: 'Marathi' },
  { code: 'fa', name: 'فارسی', nativeName: 'Persian' },
  { code: 'he', name: 'עברית', nativeName: 'Hebrew' },
  { code: 'sw', name: 'Kiswahili', nativeName: 'Swahili' },
  { code: 'ca', name: 'Català', nativeName: 'Catalan' },
  { code: 'hr', name: 'Hrvatski', nativeName: 'Croatian' },
  { code: 'jv', name: 'Basa Jawa', nativeName: 'Javanese' },
  { code: 'su', name: 'Basa Sunda', nativeName: 'Sundanese' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
  { code: 'la', name: 'Latin', nativeName: 'Latin' },
  { code: 'ga', name: 'Gaeilge', nativeName: 'Irish' },
  { code: 'cy', name: 'Cymraeg', nativeName: 'Welsh' }
];

const getSettingsTranslations = (lang: string) => {
  const l = (lang || '').toLowerCase();
  if (l.includes('indonesia')) {
    return {
      title: "Settings",
      theme: "Tema",
      appLang: "Bahasa aplikasi",
      haptic: "Umpan balik haptik",
      storageTitle: "Penyimpanan & Privasi",
      storageDesc: "Semua riwayat chat disimpan secara lokal di browser Anda untuk perlindungan privasi penuh.",
      totalSessions: "Total Sesi",
      totalMessages: "Total Pesan",
      deleteTitle: "Hapus Seluruh Riwayat Chat",
      deleteDesc: "Tindakan ini akan menghapus semua pesan dan file lampiran dari browser ini secara permanen. Tindakan tidak dapat dibatalkan.",
      deleteBtn: "Hapus Semua Riwayat Chat",
      confirmTitle: "Apakah Anda sangat yakin?",
      yesDelete: "Ya, Hapus Permanen",
      cancel: "Batal",
      successMsg: "Riwayat chat berhasil dihapus secara permanen!",
      backTitle: "Kembali",
      searchPlaceholder: "Cari bahasa...",
      searchNotFound: "Bahasa tidak ditemukan",
      searchNotFoundDesc: "Coba gunakan kata kunci pencarian lainnya.",
      shown: "bahasa ditampilkan",
      selectApply: "Pilih untuk menerapkan",
      sessionsUnit: "Sesi",
      messagesUnit: "Pesan"
    };
  }
  if (l.includes('jav') || l.includes('jawa')) {
    return {
      title: "Setelan",
      theme: "Tema",
      appLang: "Basa aplikasi",
      haptic: "Umpan balik haptik",
      storageTitle: "Panyimpenan & Privasi",
      storageDesc: "Sedaya riwayat obrolan dipun simpen sacara lokal ing browser Panjenengan kagem perlindungan privasi kebak.",
      totalSessions: "Total Sesi",
      totalMessages: "Total Pesen",
      deleteTitle: "Busak Kabeh Riwayat Obrolan",
      deleteDesc: "Tindakan niki bakal mbusak sedaya pesen lan lampiran berkas saking browser niki sacara permanen. Tindakan mboten saged dibatalake.",
      deleteBtn: "Busak Kabeh Riwayat Obrolan",
      confirmTitle: "Nopo Panjenengan yakin sanget?",
      yesDelete: "Inggih, Busak Permanen",
      cancel: "Batal",
      successMsg: "Riwayat obrolan kasil dibusak sacara permanen!",
      backTitle: "Wangsul",
      searchPlaceholder: "Padosi basa...",
      searchNotFound: "Basa mboten kepanggih",
      searchNotFoundDesc: "Coba padosi ngangge kata kunci sanese.",
      shown: "basa dipun tampilaken",
      selectApply: "Pilih kagem diterapaken",
      sessionsUnit: "Sesi",
      messagesUnit: "Pesen"
    };
  }
  if (l.includes('sunda')) {
    return {
      title: "Setelan",
      theme: "Téma",
      appLang: "Basa aplikasi",
      haptic: "Umpan balik haptik",
      storageTitle: "Panyimpenan & Privasi",
      storageDesc: "Sadaya riwayat obrolan disimpen sacara lokal dina browser Anjeun kanggo panyalindungan privasi pinuh.",
      totalSessions: "Total Sesi",
      totalMessages: "Total Pesen",
      deleteTitle: "Hapus Sadaya Riwayat Obrolan",
      deleteDesc: "Tindakan ieu bakal ngahapus sadaya pesen sareng lampiran file tina browser ieu sacara permanen. Tindakan teu tiasa dibatalkeun.",
      deleteBtn: "Hapus Sadaya Riwayat Obrolan",
      confirmTitle: "Naha Anjeun yakin pisan?",
      yesDelete: "Sumuhun, Hapus Permanen",
      cancel: "Batal",
      successMsg: "Riwayat obrolan hasil dihapus sacara permanen!",
      backTitle: "Balik",
      searchPlaceholder: "Pilari basa...",
      searchNotFound: "Basa teu kapendak",
      searchNotFoundDesc: "Cobian nganggo kecap konci sanés.",
      shown: "basa ditémbongkeun",
      selectApply: "Pilih pikeun nerapkeun",
      sessionsUnit: "Sesi",
      messagesUnit: "Pesen"
    };
  }
  if (l.includes('espanol') || l.includes('español') || l.includes('spanish')) {
    return {
      title: "Ajustes",
      theme: "Tema",
      appLang: "Idioma de la app",
      haptic: "Respuesta háptica",
      storageTitle: "Almacenamiento y Privacidad",
      storageDesc: "Todo el historial de chat se almacena localmente en su navegador para una protección total de la privacidad.",
      totalSessions: "Sesiones totales",
      totalMessages: "Mensajes totales",
      deleteTitle: "Eliminar todo el historial de chat",
      deleteDesc: "Esta acción eliminará permanentemente todos los mensajes y archivos adjuntos de este navegador. Esta acción no se puede deshacer.",
      deleteBtn: "Eliminar todo el historial",
      confirmTitle: "¿Está absolutamente seguro?",
      yesDelete: "Sí, eliminar permanentemente",
      cancel: "Cancelar",
      successMsg: "¡Historial de chat eliminado con éxito!",
      backTitle: "Atrás",
      searchPlaceholder: "Buscar idioma...",
      searchNotFound: "Idioma no encontrado",
      searchNotFoundDesc: "Intente utilizar otras palabras clave de búsqueda.",
      shown: "idiomas mostrados",
      selectApply: "Seleccionar para aplicar",
      sessionsUnit: "Sesiones",
      messagesUnit: "Mensajes"
    };
  }
  if (l.includes('francais') || l.includes('français') || l.includes('french')) {
    return {
      title: "Paramètres",
      theme: "Thème",
      appLang: "Langue de l'application",
      haptic: "Retour haptique",
      storageTitle: "Stockage & Confidentialité",
      storageDesc: "Tout l'historique des discussions est stocké localement dans votre navigateur pour une confidentialité totale.",
      totalSessions: "Total des sessions",
      totalMessages: "Total des messages",
      deleteTitle: "Supprimer tout l'historique",
      deleteDesc: "Cette action supprimera définitivement tous les messages et pièces jointes de ce navigateur. Cette action est irréversible.",
      deleteBtn: "Supprimer tout l'historique",
      confirmTitle: "Êtes-vous absolument sûr ?",
      yesDelete: "Oui, supprimer définitivement",
      cancel: "Annuler",
      successMsg: "Historique des discussions supprimé avec succès !",
      backTitle: "Retour",
      searchPlaceholder: "Rechercher une langue...",
      searchNotFound: "Langue non trouvée",
      searchNotFoundDesc: "Essayez d'utiliser d'autres mots-clés.",
      shown: "langues affichées",
      selectApply: "Sélectionner pour appliquer",
      sessionsUnit: "Sessions",
      messagesUnit: "Messages"
    };
  }
  if (l.includes('deutsch') || l.includes('german')) {
    return {
      title: "Einstellungen",
      theme: "Design",
      appLang: "App-Sprache",
      haptic: "Haptisches Feedback",
      storageTitle: "Speicher & Datenschutz",
      storageDesc: "Der gesamte Chatverlauf wird lokal in Ihrem Browser gespeichert, um die Privatsphäre vollständig zu schützen.",
      totalSessions: "Gesamte Sitzungen",
      totalMessages: "Gesamte Nachrichten",
      deleteTitle: "Gesamten Chatverlauf löschen",
      deleteDesc: "Diese Aktion löscht dauerhaft alle Nachrichten und Dateianhänge aus diesem Browser. Dies kann nicht rückgängig gemacht werden.",
      deleteBtn: "Gesamten Verlauf löschen",
      confirmTitle: "Sind Sie absolut sicher?",
      yesDelete: "Ja, dauerhaft löschen",
      cancel: "Abbrechen",
      successMsg: "Chatverlauf erfolgreich gelöscht!",
      backTitle: "Zurück",
      searchPlaceholder: "Sprache suchen...",
      searchNotFound: "Sprache nicht gefunden",
      searchNotFoundDesc: "Versuchen Sie andere Suchbegriffe.",
      shown: "Sprachen angezeigt",
      selectApply: "Zum Anwenden auswählen",
      sessionsUnit: "Sitzungen",
      messagesUnit: "Nachrichten"
    };
  }
  if (l.includes('nihon') || l.includes('japan') || l.includes('日本語') || l.includes('ja')) {
    return {
      title: "設定",
      theme: "テーマ",
      appLang: "アプリの言語",
      haptic: "触覚フィードバック",
      storageTitle: "ストレージとプライバシー",
      storageDesc: "完全なプライバシー保護のため、すべてのチャット履歴はブラウザにローカルに保存されます。",
      totalSessions: "総セッション数",
      totalMessages: "総メッセージ数",
      deleteTitle: "すべてのチャット履歴を削除",
      deleteDesc: "この操作により、このブラウザからすべてのメッセージと添付ファイルが永久に削除されます。この操作は取り消せません。",
      deleteBtn: "履歴をすべて削除",
      confirmTitle: "本当によろしいですか？",
      yesDelete: "はい、永久に削除する",
      cancel: "キャンセル",
      successMsg: "チャット履歴が正常に削除されました！",
      backTitle: "戻る",
      searchPlaceholder: "言語を検索...",
      searchNotFound: "言語が見つかりません",
      searchNotFoundDesc: "他の検索キーワードをお試しください。",
      shown: "個の言語を表示中",
      selectApply: "適用するものを選択",
      sessionsUnit: "セッション",
      messagesUnit: "メッセージ"
    };
  }
  // Default to English
  return {
    title: "Settings",
    theme: "Theme",
    appLang: "App language",
    haptic: "Haptic feedback",
    storageTitle: "Storage & Privacy",
    storageDesc: "All chat history is stored locally in your browser for full privacy protection.",
    totalSessions: "Total Sessions",
    totalMessages: "Total Messages",
    deleteTitle: "Delete All Chat History",
    deleteDesc: "This action will permanently delete all messages and file attachments from this browser. This action cannot be undone.",
    deleteBtn: "Clear All Chat History",
    confirmTitle: "Are you absolutely sure?",
    yesDelete: "Yes, Delete Permanently",
    cancel: "Cancel",
    successMsg: "Chat history deleted permanently!",
    backTitle: "Back",
    searchPlaceholder: "Search language...",
    searchNotFound: "Language not found",
    searchNotFoundDesc: "Try using other search terms.",
    shown: "languages shown",
    selectApply: "Select to apply",
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
  setAppLang
}: SettingsProps) {

  const s = getSettingsTranslations(appLang);

  const [hapticFeedback, setHapticFeedback] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('davecore_haptic');
      return saved !== 'false'; // default to true
    } catch (e) {
      return true;
    }
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('davecore_haptic', String(hapticFeedback));
    } catch (e) {
      console.error(e);
    }
    if (hapticFeedback && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
  }, [hapticFeedback]);

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

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-10 flex flex-col h-full overflow-y-auto select-none">
      {/* Header with back button and settings gear icon */}
      <div className="flex items-center gap-1.5 mb-6">
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
          <div className="text-gray-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
            <SettingsIcon size={18} />
          </div>
          <h1 className="font-serif text-lg font-bold text-gray-900 dark:text-zinc-50">{s.title}</h1>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden mb-6 p-2 md:p-4">
        
        {/* Row: Umpan balik haptik */}
        <div className="w-full flex items-center justify-between p-4 md:p-5 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="text-gray-700 dark:text-zinc-300">
              <Vibrate size={20} className="stroke-[1.8]" />
            </div>
            <span className="text-[15px] md:text-[16px] font-semibold text-gray-900 dark:text-zinc-100">{s.haptic}</span>
          </div>
          
          {/* Custom Toggle Switch */}
          <button
            onClick={() => {
              setHapticFeedback(!hapticFeedback);
              if (!hapticFeedback && window.navigator && window.navigator.vibrate) {
                setTimeout(() => window.navigator.vibrate(30), 50);
              }
            }}
            className={`w-[52px] h-[32px] rounded-full p-[3px] transition-colors duration-300 outline-none flex items-center cursor-pointer ${
              hapticFeedback ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-700'
            }`}
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-[26px] h-[26px] rounded-full bg-white shadow-md"
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
            <span className="text-[16px] font-bold text-gray-800 dark:text-zinc-200">{chatSessionsCount} {s.sessionsUnit}</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-100/80 dark:border-zinc-800/60 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <span className="block text-[10px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">{s.totalMessages}</span>
            <span className="text-[16px] font-bold text-gray-800 dark:text-zinc-200">{totalMessagesCount} {s.messagesUnit}</span>
          </div>
        </div>

        {/* Warning and Delete Button */}
        <div className="mx-4 border border-red-100/60 dark:border-red-950/40 bg-red-50/30 dark:bg-red-950/10 p-5 rounded-2xl space-y-4">
          <div className="flex gap-3 items-start text-red-700 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
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

    </div>
  );
}
