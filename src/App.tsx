import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession, CanvasDocument } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { PreviewPage } from './components/PreviewPage';
import { CanvasPanel } from './components/CanvasPanel';
import { TypingIndicator } from './components/TypingIndicator';
import { Menu, PanelLeft, ArrowRight, Settings, Trash2, MessageSquare, Database, Sparkles, X, Check, AlertCircle, ArrowDown, Code2, PenTool, Lightbulb, BookOpen, Pen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SettingsComponent from './components/Settings';
import { LoginScreen } from './components/LoginScreen';
import { getSupabase, isSupabaseConfigured } from './lib/supabase';

const suggestions = [
  {
    title: 'Analisis kode',
    prompt: 'Tolong analisis kode JavaScript/TypeScript berikut untuk mencari potensi bug dan memberikan rekomendasi optimasi performa:\n\n```typescript\n\n```',
    iconName: 'Code2'
  },
  {
    title: 'Tulis draf',
    prompt: 'Tolong tulis draf email penawaran kerja sama profesional yang menarik untuk diajukan ke calon klien atau partner bisnis.',
    iconName: 'PenTool'
  },
  {
    title: 'Tanya ide baru',
    prompt: 'Bantu saya brainstorming 5 ide proyek sampingan unik dan kreatif yang menggabungkan AI dengan web development menggunakan React.',
    iconName: 'Lightbulb'
  },
  {
    title: 'Jelaskan konsep',
    prompt: 'Jelaskan konsep Quantum Computing secara sederhana menggunakan analogi kehidupan sehari-hari agar mudah dipahami anak umur 10 tahun.',
    iconName: 'BookOpen'
  }
];

const BarsStaggered = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="16" y1="6" y2="6" />
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="12" y1="18" y2="18" />
  </svg>
);

const getInitialPrefix = () => {
  try {
    const savedUser = localStorage.getItem('davecore_active_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.email) {
        return `user_${parsed.email}`;
      }
    }
    const dId = localStorage.getItem('davecore_device_id') || 'dev_default';
    return `device_${dId}`;
  } catch (e) {
    return 'device_default';
  }
};

export default function App() {
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState<'agreement' | 'name' | 'none'>(() => {
    try {
      const prefix = getInitialPrefix();
      const savedName = localStorage.getItem(`davecore_username_${prefix}`);
      const agreedOnboarding = localStorage.getItem(`davecore_onboarding_agreed_${prefix}`) === 'true';
      if (savedName && savedName.trim() && agreedOnboarding) {
        return 'none';
      }
      return 'agreement';
    } catch (e) {
      return 'agreement';
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // User Authentication State (Supabase / Simulated)
  const [user, setUser] = useState<{ email: string; id: string; provider: string } | null>(() => {
    try {
      const savedUser = localStorage.getItem('davecore_active_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // Listen to real-time Supabase auth transitions
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Get current session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = {
          email: session.user.email || '',
          id: session.user.id,
          provider: session.user.app_metadata.provider || 'email',
        };
        setUser(u);
        localStorage.setItem('davecore_active_user', JSON.stringify(u));
      }
    });

    // Subscribe to auth state changes in real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = {
          email: session.user.email || '',
          id: session.user.id,
          provider: session.user.app_metadata.provider || 'email',
        };
        setUser(u);
        localStorage.setItem('davecore_active_user', JSON.stringify(u));
      } else {
        setUser(null);
        localStorage.removeItem('davecore_active_user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Device ID for separate Guest/Device storage
  const [deviceId] = useState<string>(() => {
    try {
      let dId = localStorage.getItem('davecore_device_id');
      if (!dId) {
        dId = 'dev_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('davecore_device_id', dId);
      }
      return dId;
    } catch (e) {
      return 'dev_fallback';
    }
  });

  // Get key suffix depending on authentication state
  const getStoragePrefix = (activeUser: typeof user) => {
    return activeUser ? `user_${activeUser.email}` : `device_${deviceId}`;
  };

  const [userName, setUserName] = useState('');
  const [memories, setMemories] = useState<string[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [theme, setTheme] = useState<'Sistem' | 'Terang' | 'Gelap'>(() => {
    try {
      const prefix = getInitialPrefix();
      return (localStorage.getItem(`davecore_theme_${prefix}`) as any) || 'Sistem';
    } catch (e) {
      return 'Sistem';
    }
  });

  const [appLang, setAppLang] = useState<string>(() => {
    try {
      const prefix = getInitialPrefix();
      const saved = localStorage.getItem(`davecore_app_lang_${prefix}`);
      if (saved) return saved;
      
      // Auto-detect browser/system/phone language
      const navLang = window.navigator.language || (window.navigator as any).userLanguage || '';
      const code = navLang.substring(0, 2).toLowerCase();
      if (code === 'id') {
        return 'Bahasa Indonesia';
      }
      return 'English'; // default to English
    } catch (e) {
      return 'English';
    }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [activeCanvasDoc, setActiveCanvasDoc] = useState<CanvasDocument | null>(null);
  const [isCanvasGenerating, setIsCanvasGenerating] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('davecore_ai_model');
      return saved || 'gemini-3.5-flash';
    } catch (e) {
      return 'gemini-3.5-flash';
    }
  });

  // Save chosen model to local storage
  useEffect(() => {
    try {
      localStorage.setItem('davecore_ai_model', aiModel);
    } catch (e) {
      console.error(e);
    }
  }, [aiModel]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledUpRef = useRef(false);

  const loadedPrefixRef = useRef<string | null>(null);

  // Load and sync chat history from Supabase
  const loadChatSessionsFromSupabase = async (activeUser: any) => {
    const supabase = getSupabase();
    if (!supabase || !activeUser) return null;
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', activeUser.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('Supabase: unable to fetch chat history (tables may not be created yet):', error);
        if (
          error.code === '42P01' || 
          error.message?.includes('relation') || 
          error.message?.includes('does not exist') || 
          error.message?.includes('schema cache') || 
          error.message?.includes('Could not find') || 
          error.message?.includes('table')
        ) {
          setSupabaseError('missing_tables');
        } else {
          setSupabaseError(error.message || 'database_error');
        }
        return null;
      }

      setSupabaseError(null);
      if (data && data.length > 0) {
        const sessions: ChatSession[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          messages: row.messages || [],
          timestamp: new Date(row.updated_at).getTime()
        }));
        return sessions;
      }
    } catch (err) {
      console.warn('Supabase: exception while fetching chat history:', err);
      setSupabaseError(err instanceof Error ? err.message : 'network_error');
    }
    return null;
  };

  // Reactive accounts and device isolation synchronization
  useEffect(() => {
    setIsLoadingProfile(true);
    const prefix = getStoragePrefix(user);
    
    // 1. Load localized username
    const savedName = localStorage.getItem(`davecore_username_${prefix}`);
    setUserName(savedName || '');

    // 2. Load memories
    const savedMemories = localStorage.getItem(`davecore_memories_${prefix}`);
    setMemories(savedMemories ? JSON.parse(savedMemories) : []);

    // 4. Load localized theme
    const savedTheme = localStorage.getItem(`davecore_theme_${prefix}`);
    setTheme((savedTheme as any) || 'Sistem');

    // 5. Load localized app language
    const savedLang = localStorage.getItem(`davecore_app_lang_${prefix}`);
    if (savedLang) {
      setAppLang(savedLang);
    } else {
      // Auto-detect browser/system/phone language
      const navLang = window.navigator.language || (window.navigator as any).userLanguage || '';
      const code = navLang.substring(0, 2).toLowerCase();
      setAppLang(code === 'id' ? 'Bahasa Indonesia' : 'English');
    }

    // Load profile and memories from Supabase if authenticated
    const loadProfileFromSupabase = async (activeUser: any) => {
      const supabase = getSupabase();
      if (!supabase || !activeUser) return;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('username, memories')
          .eq('id', activeUser.id)
          .maybeSingle();
        if (data) {
          if (data.username) {
            setUserName(data.username);
            localStorage.setItem(`davecore_username_${prefix}`, data.username);
            localStorage.setItem(`davecore_onboarding_agreed_${prefix}`, 'true');
            setOnboardingStep('none');
          }
          if (data.memories && Array.isArray(data.memories)) {
            setMemories(data.memories);
            localStorage.setItem(`davecore_memories_${prefix}`, JSON.stringify(data.memories));
          }
        }
      } catch (err) {
        console.warn('Supabase: exception while loading profile:', err);
      }
    };

    // Load initial sessions asynchronously
    const loadInitialSessions = async () => {
      if (user) {
        await loadProfileFromSupabase(user);
      }

      let loadedSessions: ChatSession[] = [];
      if (user) {
        const dbSessions = await loadChatSessionsFromSupabase(user);
        if (dbSessions && dbSessions.length > 0) {
          loadedSessions = dbSessions;
          // Sync back to localStorage to keep it up to date
          try {
            localStorage.setItem(`davecore_sessions_${prefix}`, JSON.stringify(dbSessions));
          } catch (e) {
            console.error(e);
          }
        } else {
          // Fallback to localStorage if database is empty or offline
          const savedSessions = localStorage.getItem(`davecore_sessions_${prefix}`);
          loadedSessions = savedSessions ? JSON.parse(savedSessions) : [];
        }
      } else {
        // Guest user: load from local storage
        const savedSessions = localStorage.getItem(`davecore_sessions_${prefix}`);
        loadedSessions = savedSessions ? JSON.parse(savedSessions) : [];
      }

      setChatSessions(loadedSessions);

      // 6. Always start with a clean New Chat on page refresh/initial load
      setCurrentSessionId(null);
      setMessages([]);

      // 7. Check if onboarding completed
      const finalName = localStorage.getItem(`davecore_username_${prefix}`);
      const agreedOnboarding = localStorage.getItem(`davecore_onboarding_agreed_${prefix}`) === 'true';
      if (user) {
        // Registered / logged-in users bypass the agreement screen entirely!
        if (finalName && finalName.trim()) {
          setOnboardingStep('none');
        } else {
          setOnboardingStep('name');
        }
      } else {
        // Guest user
        if (finalName && finalName.trim() && agreedOnboarding) {
          setOnboardingStep('none');
        } else {
          setOnboardingStep('agreement');
        }
      }

      // Allow future saves now that loading is completely finished
      loadedPrefixRef.current = prefix;
      setIsLoadingProfile(false);
    };

    loadInitialSessions();
  }, [user]);

  // Persist chat sessions on update with debounced Supabase synchronisation
  useEffect(() => {
    const prefix = getStoragePrefix(user);
    if (loadedPrefixRef.current !== prefix) return; // Prevent premature default empty save
    
    // 1. Save to local storage
    try {
      localStorage.setItem(`davecore_sessions_${prefix}`, JSON.stringify(chatSessions));
    } catch (e) {
      console.error('Error saving chat sessions:', e);
    }

    // 2. Save to Supabase if logged in
    const syncSessionsToSupabase = async () => {
      const supabase = getSupabase();
      if (!supabase || !user) return;

      try {
        // Upsert sessions in parallel to ensure complete persistence
        const promises = chatSessions.map(session => {
          return supabase
            .from('chat_history')
            .upsert({
              id: session.id,
              user_id: user.id,
              title: session.title,
              messages: session.messages,
              updated_at: new Date(session.timestamp || Date.now()).toISOString()
            }, { onConflict: 'id' });
        });
        
        await Promise.all(promises);
      } catch (err) {
        console.error('Failed to sync sessions to Supabase:', err);
      }
    };

    const timer = setTimeout(() => {
      syncSessionsToSupabase();
    }, 850); // 850ms debounce to prevent high-frequency DB queries during active chat streaming

    return () => clearTimeout(timer);
  }, [chatSessions, user]);

  // Persist memories on update
  useEffect(() => {
    const prefix = getStoragePrefix(user);
    if (loadedPrefixRef.current !== prefix) return; // Prevent premature default empty save
    try {
      localStorage.setItem(`davecore_memories_${prefix}`, JSON.stringify(memories));
    } catch (e) {
      console.error('Error saving memories:', e);
    }

    const syncMemoriesToDb = async () => {
      const supabase = getSupabase();
      if (supabase && user) {
        try {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ memories: memories })
            .eq('id', user.id);

          if (updateError) {
            console.warn('Could not sync memories to Supabase (column may be missing):', updateError.message);
          }
        } catch (err) {
          console.error('Failed to sync memories to Supabase:', err);
        }
      }
    };

    if (user) {
      const timer = setTimeout(() => {
        syncMemoriesToDb();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [memories, user]);



  // Persist currentSessionId on update
  useEffect(() => {
    const prefix = getStoragePrefix(user);
    if (loadedPrefixRef.current !== prefix) return;
    try {
      if (currentSessionId) {
        localStorage.setItem(`davecore_current_session_id_${prefix}`, currentSessionId);
      } else {
        localStorage.removeItem(`davecore_current_session_id_${prefix}`);
      }
    } catch (e) {
      console.error('Error saving currentSessionId:', e);
    }
  }, [currentSessionId, user]);

  // Save localized username helper
  const handleSaveUserName = async (name: string) => {
    setUserName(name);
    const prefix = getStoragePrefix(user);
    localStorage.setItem(`davecore_username_${prefix}`, name);

    const supabase = getSupabase();
    if (supabase && user) {
      try {
        await supabase
          .from('user_profiles')
          .upsert({ id: user.id, username: name }, { onConflict: 'id' });
      } catch (err) {
        console.error('Failed to sync username to Supabase:', err);
      }
    }
  };

  // Extract memories automatically from conversation message content
  const extractAndAddMemory = (text: string) => {
    const newFacts: string[] = [];
    
    // Name pattern: "nama saya x", "panggil saya x"
    const nameMatch = text.match(/(?:nama saya|panggil saja saya|panggil saya|saya biasa dipanggil)\s+([A-Za-z ]{2,20})/i);
    if (nameMatch && nameMatch[1]) {
      newFacts.push(`Nama saya adalah ${nameMatch[1].trim()}`);
    }
    
    // Profession pattern: "saya adalah seorang x", "saya bekerja sebagai x"
    const jobMatch = text.match(/(?:saya bekerja sebagai|pekerjaan saya|saya adalah seorang|profesi saya)\s+([A-Za-z ]{3,30})/i);
    if (jobMatch && jobMatch[1]) {
      newFacts.push(`Pekerjaan saya: ${jobMatch[1].trim()}`);
    }
    
    // Direct remember instruction: "ingat bahwa x", "tolong ingat x"
    const rememberMatch = text.match(/(?:tolong ingat|ingat bahwa|ingat)\s+([\s\S]{3,100})/i);
    if (rememberMatch && rememberMatch[1]) {
      newFacts.push(`Mengingat detail: ${rememberMatch[1].trim()}`);
    }

    // Stack preferences: "saya menggunakan x", "saya pakai x", "teknologi favorit saya adalah x"
    const techMatch = text.match(/(?:saya menggunakan|saya pakai|teknologi favorit saya adalah|saya sedang belajar)\s+([A-Za-z0-9,. ]{3,25})/i);
    if (techMatch && techMatch[1]) {
      newFacts.push(`Sedang belajar/menggunakan teknologi: ${techMatch[1].trim()}`);
    }

    if (newFacts.length > 0) {
      setMemories(prev => {
        const updated = [...prev];
        newFacts.forEach(fact => {
          if (!updated.some(f => f.toLowerCase() === fact.toLowerCase())) {
            updated.push(fact);
          }
        });
        return updated;
      });
    }
  };

  const extractMemoryTags = (text: string) => {
    const regex = /\[MEMORY_ADD:\s*(.*?)\]/gi;
    const matches = [...text.matchAll(regex)];
    const extracted: string[] = [];
    for (const match of matches) {
      if (match[1] && match[1].trim()) {
        extracted.push(match[1].trim());
      }
    }
    return {
      cleanedText: text.replace(/\[MEMORY_ADD:\s*.*?\]/gi, '').trim(),
      extracted
    };
  };

  const extractCanvasDocs = (text: string) => {
    const docs: CanvasDocument[] = [];
    
    // Match <canvas id="..." title="..." language="...">...</canvas>
    // Since the document stream might not be finished, the closing tag </canvas> is optional
    const regex = /<canvas\s+id="([^"]+)"\s+title="([^"]+)"\s+language="([^"]+)"\s*>([\s\S]*?)(?:<\/canvas>|$)/gi;
    const matches = [...text.matchAll(regex)];
    
    for (const match of matches) {
      const [fullMatch, id, title, language, content] = match;
      docs.push({
        id: id.trim(),
        title: title.trim(),
        language: language.trim(),
        content: content
      });
    }
    
    let cleanedText = text.replace(/<canvas\s+id="([^"]+)"\s+title="([^"]+)"\s+language="([^"]+)"\s*>([\s\S]*?)(?:<\/canvas>|$)/gi, (match, id, title, language) => {
      return `\n\n:::canvas-card\nID: ${id}\nTitle: ${title}\nLanguage: ${language}\n:::\n\n`;
    });
    
    return { cleanedText, docs };
  };

  const handleSaveCanvasContent = (id: string, updatedContent: string) => {
    if (!activeCanvasDoc) return;
    
    const updatedDoc = { ...activeCanvasDoc, content: updatedContent };
    setActiveCanvasDoc(updatedDoc);
    
    // Update the canvasDoc in the active session
    if (currentSessionId) {
      setChatSessions(prev => prev.map(s => 
        s.id === currentSessionId
          ? { ...s, canvasDoc: updatedDoc }
          : s
      ));
    }
  };

  const handleRequestCanvasRevision = (doc: CanvasDocument, prompt: string) => {
    const formattedPrompt = `[MINTA REVISI CANVAS]
Dokumen: "${doc.title}" (ID: "${doc.id}", Bahasa: "${doc.language}")

Isi Dokumen Terkini:
\`\`\`${doc.language}
${doc.content}
\`\`\`

Permintaan Revisi Pengguna:
"${prompt}"

Silakan revisi/lanjutkan isi dokumen canvas tersebut sesuai instruksi di atas secara cerdas. Pastikan untuk selalu mengeluarkan seluruh isi dokumen yang baru secara lengkap di dalam tag <canvas id="${doc.id}" title="${doc.title}" language="${doc.language}">...konten lengkap baru...</canvas> agar tersinkronisasi otomatis!`;

    handleSend(formattedPrompt);
  };

  const handleOpenCanvas = (id: string, title: string, language: string) => {
    // Search the message history for any full canvas blocks matching this ID to load its content
    let foundContent = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const regex = new RegExp(`<canvas\\s+id="${id}"[^>]*>([\\s\\S]*?)(?:<\\/canvas>|$)`, 'i');
      const match = msg.content.match(regex);
      if (match) {
        foundContent = match[1];
        break;
      }
    }
    
    if (!foundContent && activeCanvasDoc && activeCanvasDoc.id === id) {
      foundContent = activeCanvasDoc.content;
    }
    
    setActiveCanvasDoc({
      id,
      title,
      language,
      content: foundContent || 'Dokumen kosong atau sedang dimuat...'
    });
    setCanvasOpen(true);
  };

  // Apply theme class to document element on mount and when theme changes
  useEffect(() => {
    const prefix = getStoragePrefix(user);
    if (loadedPrefixRef.current !== prefix) return; // Prevent premature default empty save
    try {
      localStorage.setItem(`davecore_theme_${prefix}`, theme);
    } catch (e) {
      console.error(e);
    }
    const root = window.document.documentElement;
    if (theme === 'Gelap') {
      root.classList.add('dark');
    } else if (theme === 'Terang') {
      root.classList.remove('dark');
    } else {
      // System theme
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme, user]);

  // Persist app language change
  useEffect(() => {
    const prefix = getStoragePrefix(user);
    if (loadedPrefixRef.current !== prefix) return; // Prevent premature default empty save
    try {
      localStorage.setItem(`davecore_app_lang_${prefix}`, appLang);
    } catch (e) {
      console.error(e);
    }
  }, [appLang, user]);

  // Translation function helper
  const getLocalizedStrings = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('indonesia')) {
      return {
        welcome: "Ada yang bisa saya bantu, ",
        today: "hari ini",
        placeholder: "Tanya DAVECORE apapun...",
        disclaimer: "DAVECORE bisa saja membuat kesalahan. Harap periksa informasi penting.",
        newChat: "Chat Baru",
        settings: "Settings",
        nameModalTitle: "Siapa nama Anda?",
        nameModalDesc: "DAVECORE ingin menyapa Anda secara personal saat mulai berkonsultasi.",
        nameInputPlaceholder: "Masukkan nama Anda...",
        cancelBtn: "Batal",
        startChatBtn: "Mulai Chat",
        chatHistoryTitle: "Riwayat Chat",
        deleteChatTooltip: "Hapus chat"
      };
    }
    if (l.includes('jav') || l.includes('jawa')) {
      return {
        welcome: "Wonten ingkang saged kula bantu, ",
        today: "dinten niki",
        placeholder: "Tiyang DAVECORE nopo mawon...",
        disclaimer: "DAVECORE saged ndamel kalepatan. Mangga dipun teliti.",
        newChat: "Obrolan Anyar",
        settings: "Setelan",
        nameModalTitle: "Sinten nami sampeyan?",
        nameModalDesc: "DAVECORE pengen nyapa sampeyan sacara pribadi nalika miwiti konsultasi.",
        nameInputPlaceholder: "Lebokake jeneng sampeyan...",
        cancelBtn: "Batal",
        startChatBtn: "Mulai Chat",
        chatHistoryTitle: "Riwayat Chat",
        deleteChatTooltip: "Hapus chat"
      };
    }
    if (l.includes('sunda')) {
      return {
        welcome: "Aya anu tiasa dibantos, ",
        today: "dinten ieu",
        placeholder: "Tanya DAVECORE naon waé...",
        disclaimer: "DAVECORE tiasa lepat. Mangga parios inpormasi penting.",
        newChat: "Obrolan Anyar",
        settings: "Setelan",
        nameModalTitle: "Saha nami anjeun?",
        nameModalDesc: "DAVECORE hoyong nyapa anjeun sacara pribadi nalika ngamimitian konsultasi.",
        nameInputPlaceholder: "Lebetkeun nami anjeun...",
        cancelBtn: "Batal",
        startChatBtn: "Mulai Obrolan",
        chatHistoryTitle: "Riwayat Obrolan",
        deleteChatTooltip: "Hapus obrolan"
      };
    }
    if (l.includes('espanol') || l.includes('español') || l.includes('spanish')) {
      return {
        welcome: "¿En qué te puedo ayudar, ",
        today: "hoy",
        placeholder: "Pregúntale a DAVECORE lo que sea...",
        disclaimer: "DAVECORE puede cometer errores. Por favor verifique la información importante.",
        newChat: "Nuevo Chat",
        settings: "Ajustes",
        nameModalTitle: "¿Cómo te llamas?",
        nameModalDesc: "DAVECORE quiere saludarte personalmente al comenzar la consulta.",
        nameInputPlaceholder: "Introduce tu nombre...",
        cancelBtn: "Cancelar",
        startChatBtn: "Iniciar Chat",
        chatHistoryTitle: "Historial de Chat",
        deleteChatTooltip: "Eliminar chat"
      };
    }
    if (l.includes('francais') || l.includes('français') || l.includes('french')) {
      return {
        welcome: "Comment puis-je vous aider, ",
        today: "aujourd'hui",
        placeholder: "Demandez n'importe quoi à DAVECORE...",
        disclaimer: "DAVECORE peut faire des erreurs. Veuillez vérifier les informations importantes.",
        newChat: "Nouveau Chat",
        settings: "Paramètres",
        nameModalTitle: "Quel est votre nom ?",
        nameModalDesc: "DAVECORE souhaite vous saluer personnellement pour commencer la consultation.",
        nameInputPlaceholder: "Entrez votre nom...",
        cancelBtn: "Annuler",
        startChatBtn: "Démarrer",
        chatHistoryTitle: "Historique des Chats",
        deleteChatTooltip: "Supprimer le chat"
      };
    }
    if (l.includes('deutsch') || l.includes('german')) {
      return {
        welcome: "Wie kann ich dir helfen, ",
        today: "heute",
        placeholder: "Frag DAVECORE irgendetwas...",
        disclaimer: "DAVECORE kann Fehler machen. Bitte überprüfen Sie wichtige Informationen.",
        newChat: "Neuer Chat",
        settings: "Einstellungen",
        nameModalTitle: "Wie heißen Sie?",
        nameModalDesc: "DAVECORE möchte Sie zu Beginn der Beratung persönlich begrüßen.",
        nameInputPlaceholder: "Geben Sie Ihren Namen ein...",
        cancelBtn: "Abbrechen",
        startChatBtn: "Chat Starten",
        chatHistoryTitle: "Chatverlauf",
        deleteChatTooltip: "Chat löschen"
      };
    }
    if (l.includes('nihon') || l.includes('japan')) {
      return {
        welcome: "今日はどのようなご用件でしょうか、",
        today: "今日",
        placeholder: "DAVECOREに何でも聞いてください...",
        disclaimer: "DAVECOREは間違いを犯す可能性があります。重要な情報を確認してください。",
        newChat: "新しいチャット",
        settings: "設定",
        nameModalTitle: "お名前は何ですか？",
        nameModalDesc: "DAVECOREは、コンサルテーションを開始する際にご挨拶をさせていただきます。",
        nameInputPlaceholder: "名前を入力してください...",
        cancelBtn: "キャンセル",
        startChatBtn: "チャットを開始",
        chatHistoryTitle: "チャット履歴",
        deleteChatTooltip: "チャットを削除"
      };
    }
    return {
      welcome: "How can I help you, ",
      today: "today",
      placeholder: "Ask DAVECORE anything...",
      disclaimer: "DAVECORE can make mistakes. Please verify important information.",
      newChat: "New Chat",
      settings: "Settings",
      nameModalTitle: "What is your name?",
      nameModalDesc: "DAVECORE wants to greet you personally when starting the consultation.",
      nameInputPlaceholder: "Enter your name...",
      cancelBtn: "Cancel",
      startChatBtn: "Start Chat",
      chatHistoryTitle: "Chat History",
      deleteChatTooltip: "Delete chat"
    };
  };

  const getLocalizedSuggestions = (lang: string) => {
    const l = (lang || '').toLowerCase();
    if (l.includes('indonesia')) {
      return [
        {
          title: 'Analisis kode',
          prompt: 'Tolong analisis kode JavaScript/TypeScript berikut untuk mencari potensi bug dan memberikan rekomendasi optimasi performa:\n\n```typescript\n\n```',
          iconName: 'Code2'
        },
        {
          title: 'Tulis draf',
          prompt: 'Tolong tulis draf email penawaran kerja sama profesional yang menarik untuk diajukan ke calon klien atau partner bisnis.',
          iconName: 'PenTool'
        },
        {
          title: 'Tanya ide baru',
          prompt: 'Bantu saya brainstorming 5 ide proyek sampingan unik dan kreatif yang menggabungkan AI dengan web development menggunakan React.',
          iconName: 'Lightbulb'
        },
        {
          title: 'Jelaskan konsep',
          prompt: 'Jelaskan konsep Quantum Computing secara sederhana menggunakan analogi kehidupan sehari-hari agar mudah dipahami anak umur 10 tahun.',
          iconName: 'BookOpen'
        }
      ];
    }
    if (l.includes('jav') || l.includes('jawa')) {
      return [
        {
          title: 'Analisis kode',
          prompt: 'Tulung analisis kode JavaScript/TypeScript niki kanggo nggoleki potensi bug lan menehi rekomendasi optimasi performa:\n\n```typescript\n\n```',
          iconName: 'Code2'
        },
        {
          title: 'Tulis draf',
          prompt: 'Tulung tulis draf email tawaran kerja sama profesional sing apik kanggo diajukake menyang calon klien.',
          iconName: 'PenTool'
        },
        {
          title: 'Tanya ide anyar',
          prompt: 'Bantu kula brainstorming 5 ide proyek sampingan unik lan kreatif sing nggabungake AI karo pangembangan web nganggo React.',
          iconName: 'Lightbulb'
        },
        {
          title: 'Jelasne konsep',
          prompt: 'Jelasne konsep Quantum Computing kanthi gampang nganggo analogi urip saben dina supaya gampang dipahami bocah umur 10 tahun.',
          iconName: 'BookOpen'
        }
      ];
    }
    if (l.includes('sunda')) {
      return [
        {
          title: 'Analisis kode',
          prompt: 'Punten analisis kode JavaScript/TypeScript ieu kanggo milarian potensi bug sareng masihan rekomendasi optimasi performa:\n\n```typescript\n\n```',
          iconName: 'Code2'
        },
        {
          title: 'Tulis draf',
          prompt: 'Punten serat draf email panawaran kerja sama profésional anu pikaresepeun pikeun diajukeun ka calon klien.',
          iconName: 'PenTool'
        },
        {
          title: 'Tanya ide anyar',
          prompt: 'Bantos abdi brainstorming 5 ide proyék gigir anu unik sareng kreatif anu ngagabungkeun AI sareng pamekaran wéb nganggo React.',
          iconName: 'Lightbulb'
        },
        {
          title: 'Jelaskeun konsep',
          prompt: 'Jelaskeun konsép Quantum Computing sacara saderhana nganggo analogi kahirupan sadidinten supados gampil dipikaharti ku budak umur 10 taun.',
          iconName: 'BookOpen'
        }
      ];
    }
    if (l.includes('espanol') || l.includes('español') || l.includes('spanish')) {
      return [
        {
          title: 'Analizar código',
          prompt: 'Por favor, analiza el siguiente código JavaScript/TypeScript para buscar posibles errores y sugerir optimizaciones de rendimiento:\n\n```typescript\n\n```',
          iconName: 'Code2'
        },
        {
          title: 'Escribir borrador',
          prompt: 'Por favor, escribe un borrador de correo electrónico profesional para proponer una colaboración a un cliente potencial.',
          iconName: 'PenTool'
        },
        {
          title: 'Nuevas ideas',
          prompt: 'Ayúdame a generar 5 ideas de proyectos paralelos únicos y creativos que combinen IA con desarrollo web usando React.',
          iconName: 'Lightbulb'
        },
        {
          title: 'Explicar concepto',
          prompt: 'Explica el concepto de computación cuántica de manera sencilla utilizando una analogía de la vida cotidiana para que lo entienda un niño de 10 años.',
          iconName: 'BookOpen'
        }
      ];
    }
    if (l.includes('francais') || l.includes('français') || l.includes('french')) {
      return [
        {
          title: 'Analyser le code',
          prompt: 'Veuillez analyser le code JavaScript/TypeScript suivant pour rechercher d\'éventuels bugs et suggérer des optimisations de performances:\n\n```typescript\n\n```',
          iconName: 'Code2'
        },
        {
          title: 'Rédiger un brouillon',
          prompt: 'Veuillez rédiger un projet d\'e-mail professionnel pour proposer une collaboration à un client potentiel.',
          iconName: 'PenTool'
        },
        {
          title: 'Nouvelles idées',
          prompt: 'Aidez-moi à trouver 5 idées de projets annexes uniques et créatifs combinant l\'IA et le développement web avec React.',
          iconName: 'Lightbulb'
        },
        {
          title: 'Expliquer un concept',
          prompt: 'Expliquez le concept de l\'informatique quantique de manière simple en utilisant une analogie de la vie quotidienne pour un enfant de 10 ans.',
          iconName: 'BookOpen'
        }
      ];
    }
    if (l.includes('deutsch') || l.includes('german')) {
      return [
        {
          title: 'Code analysieren',
          prompt: 'Bitte analysieren Sie den folgenden JavaScript/TypeScript-Code, um nach potenziellen Fehlern zu suchen und Leistungsoptimierungen vorzuschlagen:\n\n```typescript\n\n```',
          iconName: 'Code2'
        },
        {
          title: 'Entwurf schreiben',
          prompt: 'Bitte schreiben Sie einen Entwurf für eine professionelle E-Mail, um einem potenziellen Kunden eine Zusammenarbeit vorzuschlagen.',
          iconName: 'PenTool'
        },
        {
          title: 'Neue Ideen fragen',
          prompt: 'Helfen Sie mir beim Brainstorming von 5 einzigartigen und kreativen Nebenprojekten, die KI mit Webentwicklung unter Verwendung von React kombinieren.',
          iconName: 'Lightbulb'
        },
        {
          title: 'Konzept erklären',
          prompt: 'Erklären Sie das Konzept des Quantencomputings auf einfache Weise anhand einer Analogie aus dem täglichen Leben für ein 10-jähriges Kind.',
          iconName: 'BookOpen'
        }
      ];
    }
    if (l.includes('nihon') || l.includes('japan')) {
      return [
        {
          title: 'コード分析',
          prompt: '潜在的なバグを探し、パフォーマンスの最適化を提案するために、次のJavaScript/TypeScriptコードを分析してください：\n\n```typescript\n\n```',
          iconName: 'Code2'
        },
        {
          title: 'ドラフト作成',
          prompt: '潜在的なクライアントにコラボレーションを提案するための、プロフェッショナルなメールのドラフトを書いてください。',
          iconName: 'PenTool'
        },
        {
          title: '新しいアイデア',
          prompt: 'Reactを使用したWeb開発とAIを組み合わせた、ユニークでクリエイティブなサイドプロジェクトのアイデアを5つブレインストーミングしてください。',
          iconName: 'Lightbulb'
        },
        {
          title: '概念の説明',
          prompt: '10歳の子どもでも理解できるように、日常生活のたとえ話を使って量子コンピュータの概念をわかりやすく説明してください。',
          iconName: 'BookOpen'
        }
      ];
    }
    return [
      {
        title: 'Analyze code',
        prompt: 'Please analyze the following JavaScript/TypeScript code to search for potential bugs and provide performance optimization recommendations:\n\n```typescript\n\n```',
        iconName: 'Code2'
      },
      {
        title: 'Write draft',
        prompt: 'Please write a draft for a professional outreach email proposing a collaboration to a prospective client or business partner.',
        iconName: 'PenTool'
      },
      {
        title: 'Ask for ideas',
        prompt: 'Help me brainstorm 5 unique and creative side project ideas that combine AI with web development using React.',
        iconName: 'Lightbulb'
      },
      {
        title: 'Explain concept',
        prompt: 'Explain the concept of Quantum Computing simply, using an analogy from everyday life so a 10-year-old child can easily understand it.',
        iconName: 'BookOpen'
      }
    ];
  };

  const localized = getLocalizedStrings(appLang);
  const localizedSuggestions = getLocalizedSuggestions(appLang);

  // Dynamic document title based on the active chat history's title
  useEffect(() => {
    if (currentSessionId) {
      const activeSession = chatSessions.find(s => s.id === currentSessionId);
      if (activeSession && activeSession.title) {
        document.title = `${activeSession.title} - DAVECORE`;
        return;
      }
    }
    document.title = "DAVECORE AI Chat";
  }, [currentSessionId, chatSessions]);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth', force = false) => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const hasStreaming = messages.some(msg => msg.isStreaming) || isTyping;
      const scrolledUpSignificantly = container.scrollHeight - container.scrollTop - container.clientHeight > 350;
      
      if (force || !userHasScrolledUpRef.current || (hasStreaming && !scrolledUpSignificantly)) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior,
        });
      }
    }
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    
    const hasStreaming = messages.some(msg => msg.isStreaming) || isTyping;
    // When streaming, use a larger threshold (150px) to prevent scroll updates from getting stuck due to layout lags
    const threshold = hasStreaming ? 150 : 35;
    const isCloseToBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    
    userHasScrolledUpRef.current = !isCloseToBottom;
    setShowScrollBottomBtn(!isCloseToBottom && container.scrollHeight > container.clientHeight);
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const scrollIfNeeded = () => {
      const hasStreaming = messages.some(msg => msg.isStreaming) || isTyping;
      const threshold = hasStreaming ? 150 : 35;
      const isCloseToBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      
      if (hasStreaming) {
        const scrolledUpSignificantly = container.scrollHeight - container.scrollTop - container.clientHeight > 350;
        if (!scrolledUpSignificantly) {
          container.scrollTop = container.scrollHeight;
          userHasScrolledUpRef.current = false;
        }
      } else {
        if (isCloseToBottom && !userHasScrolledUpRef.current) {
          container.scrollTop = container.scrollHeight;
        }
      }
    };

    // Initial scroll on messages update
    const hasStreaming = messages.some(msg => msg.isStreaming);
    scrollToBottom(hasStreaming ? 'auto' : 'smooth');

    // Create observers to continuously watch for layout and height expansions (e.g. typing animations and streaming blocks)
    let mutationObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(scrollIfNeeded);
      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scrollIfNeeded);
      resizeObserver.observe(container);

      const descendants = container.querySelectorAll('.markdown-body, pre, code');
      descendants.forEach(d => resizeObserver?.observe(d));
    }

    return () => {
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [messages, isTyping]);

  const cleanTitle = (text: string): string => {
    let clean = text;
    if (clean.includes('[File Lampiran:')) {
      const parts = clean.split('```');
      if (parts.length > 2) {
        clean = parts.slice(2).join(' ').trim();
      } else {
        clean = clean.replace(/\[File Lampiran:.*?\][\s\S]*?(\`\`\`[\s\S]*?\`\`\`\s*)?/, '').trim();
      }
    }
    if (!clean) clean = "Analisis File";
    return clean.length > 28 ? clean.substring(0, 28) + '...' : clean;
  };

  const handleSend = async (content: string) => {
    // Auto-extract memory facts from user's message in real-time
    extractAndAddMemory(content);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    let targetSessionId = currentSessionId;
    let isNewSession = false;
    if (!targetSessionId) {
      isNewSession = true;
      targetSessionId = Date.now().toString();
      setCurrentSessionId(targetSessionId);
      
      const newSession: ChatSession = {
        id: targetSessionId,
        title: "Memuat topik...",
        messages: [userMessage],
        timestamp: Date.now()
      };
      setChatSessions(prev => [newSession, ...prev]);
    } else {
      setChatSessions(prev => prev.map(s => 
        s.id === targetSessionId 
          ? { ...s, messages: [...s.messages, userMessage], timestamp: Date.now() }
          : s
      ));
    }

    if (isNewSession) {
      // Async generate topic based on user message content
      (async () => {
        try {
          let cleanContent = content;
          if (cleanContent.includes('[File Lampiran:')) {
            const parts = cleanContent.split('```');
            if (parts.length > 2) {
              cleanContent = parts.slice(2).join(' ').trim();
            } else {
              cleanContent = cleanContent.replace(/\[File Lampiran:.*?\][\s\S]*?(\`\`\`[\s\S]*?\`\`\`\s*)?/, '').trim();
            }
          }
          if (!cleanContent) cleanContent = "Analisis Berkas";

          const res = await fetch('/api/topic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: cleanContent })
          });
          const data = await res.json();
          if (data.success && data.topic) {
            setChatSessions(prev => prev.map(s => 
              s.id === targetSessionId 
                ? { ...s, title: data.topic } 
                : s
            ));
          } else {
            setChatSessions(prev => prev.map(s => 
              s.id === targetSessionId 
                ? { ...s, title: cleanTitle(content) } 
                : s
            ));
          }
        } catch (e) {
          console.error('Failed to auto-detect chat topic:', e);
          setChatSessions(prev => prev.map(s => 
            s.id === targetSessionId 
              ? { ...s, title: cleanTitle(content) } 
              : s
          ));
        }
      })();
    }

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    setIsSidebarOpen(false); // Auto close sidebar on message send for better mobile/desktop view
    userHasScrolledUpRef.current = false;
    setTimeout(() => {
      scrollToBottom('smooth', true);
    }, 50);

    let modelMessageId: string | null = null;
    let accumulatedContent = '';
    let currentPlanning: any = null;
    let currentToolsUsed: any[] = [];
    let currentGroundingMetadata: any = null;

    const prefix = getStoragePrefix(user);
    let toneStyle = 'Standar';
    let customInstructions = '';
    try {
      toneStyle = localStorage.getItem(`davecore_tone_style_${prefix}`) || 'Standar';
      customInstructions = localStorage.getItem(`davecore_custom_instructions_${prefix}`) || '';
    } catch (e) {
      console.warn('Could not read personalization from localStorage:', e);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          appLang,
          memories, // Pass active account memories to the AI system
          toneStyle,
          customInstructions,
          model: aiModel,
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                accumulatedContent += `\n\n⚠️ **Error:** ${data.error}`;
                setIsTyping(false);
                if (!modelMessageId) {
                  modelMessageId = (Date.now() + 1).toString();
                  const initialModelMessage: Message = { id: modelMessageId!, role: 'model', content: accumulatedContent, isStreaming: false };
                  setMessages((prev) => [...prev, initialModelMessage]);
                } else {
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === modelMessageId 
                        ? { ...msg, content: accumulatedContent, isStreaming: false } 
                        : msg
                    )
                  );
                }
              } else if (data.planning) {
                currentPlanning = data.planning;
                setIsTyping(false);
                if (!modelMessageId) {
                  modelMessageId = (Date.now() + 1).toString();
                  const initialModelMessage: Message = { 
                    id: modelMessageId!, 
                    role: 'model', 
                    content: '', 
                    isStreaming: true,
                    toolsUsed: currentToolsUsed
                  };
                  (initialModelMessage as any).planning = currentPlanning;
                  setMessages((prev) => [...prev, initialModelMessage]);
                } else {
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === modelMessageId 
                        ? { ...msg, planning: currentPlanning } as any
                        : msg
                    )
                  );
                }
              } else if (data.toolStatus) {
                const existingIdx = currentToolsUsed.findIndex(t => t.name === data.toolStatus.name);
                if (existingIdx > -1) {
                  currentToolsUsed[existingIdx] = data.toolStatus;
                } else {
                  currentToolsUsed.push(data.toolStatus);
                }
                setIsTyping(false);
                if (!modelMessageId) {
                  modelMessageId = (Date.now() + 1).toString();
                  const initialModelMessage: Message = { 
                    id: modelMessageId!, 
                    role: 'model', 
                    content: '', 
                    isStreaming: true,
                    toolsUsed: [...currentToolsUsed]
                  };
                  setMessages((prev) => [...prev, initialModelMessage]);
                } else {
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === modelMessageId 
                        ? { ...msg, toolsUsed: [...currentToolsUsed] } 
                        : msg
                    )
                  );
                }
              } else if (data.groundingMetadata) {
                currentGroundingMetadata = data.groundingMetadata;
                if (modelMessageId) {
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === modelMessageId 
                        ? { ...msg, groundingMetadata: currentGroundingMetadata } 
                        : msg
                    )
                  );
                }
              } else if (data.text) {
                accumulatedContent += data.text;
                setIsTyping(false); // Hide the bounce typing indicator as soon as text stream begins

                // Extract streamed canvas documents in real-time
                const { docs } = extractCanvasDocs(accumulatedContent);
                if (docs.length > 0) {
                  const latestDoc = docs[docs.length - 1];
                  setActiveCanvasDoc(latestDoc);
                  setCanvasOpen(true);
                  setIsCanvasGenerating(true);
                }

                if (!modelMessageId) {
                  modelMessageId = (Date.now() + 1).toString();
                  const initialModelMessage: Message = { id: modelMessageId!, role: 'model', content: accumulatedContent, isStreaming: true, toolsUsed: [...currentToolsUsed] };
                  if (currentPlanning) {
                    (initialModelMessage as any).planning = currentPlanning;
                  }
                  setMessages((prev) => [...prev, initialModelMessage]);
                } else {
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === modelMessageId 
                        ? { ...msg, content: accumulatedContent, toolsUsed: [...currentToolsUsed], planning: currentPlanning } as any
                        : msg
                    )
                  );
                }
              }
            } catch (e) {
              console.error('Error parsing JSON from stream:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      const errId = Date.now().toString();
      const errMessage: Message = { id: errId, role: 'model', content: 'Maaf, terjadi kesalahan saat memproses permintaan Anda.' };
      setMessages((prev) => [...prev, errMessage]);
      
      setChatSessions(prev => prev.map(s => 
        s.id === targetSessionId
          ? { ...s, messages: [...s.messages, errMessage] }
          : s
      ));
    } finally {
      setIsTyping(false);
      setIsCanvasGenerating(false);
      if (modelMessageId) {
        const { cleanedText: textNoMemories, extracted } = extractMemoryTags(accumulatedContent);

        // Auto-persist extracted memories per account in real-time
        if (extracted.length > 0) {
          setMemories(prev => {
            const updated = [...prev];
            extracted.forEach(fact => {
              if (!updated.some(f => f.toLowerCase() === fact.toLowerCase())) {
                updated.push(fact);
              }
            });
            return updated;
          });
        }

        // Extract canvas documents and replace with visual canvas cards in the chat bubble
        const { cleanedText: textNoCanvas, docs } = extractCanvasDocs(textNoMemories);
        
        let finalCanvasDoc: CanvasDocument | null = null;
        if (docs.length > 0) {
          finalCanvasDoc = docs[docs.length - 1];
          setActiveCanvasDoc(finalCanvasDoc);
          setCanvasOpen(true);
        }

        const finalText = textNoCanvas;

        const finalModelMessage: Message = { 
          id: modelMessageId, 
          role: 'model', 
          content: finalText, 
          isStreaming: false,
          toolsUsed: [...currentToolsUsed],
          groundingMetadata: currentGroundingMetadata
        };
        if (currentPlanning) {
          (finalModelMessage as any).planning = currentPlanning;
        }

        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === modelMessageId 
              ? finalModelMessage
              : msg
          )
        );

        setChatSessions(prev => prev.map(s => 
          s.id === targetSessionId
            ? { 
                ...s, 
                canvasDoc: finalCanvasDoc || s.canvasDoc || null,
                messages: [
                  ...s.messages.filter(m => m.id !== modelMessageId),
                  finalModelMessage
                ]
              }
            : s
        ));
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setActiveCanvasDoc(null);
    setCanvasOpen(false);
    setIsSidebarOpen(false);
    userHasScrolledUpRef.current = false;
  };

  const handleLoadSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      
      if (session.canvasDoc) {
        setActiveCanvasDoc(session.canvasDoc);
        setCanvasOpen(true);
      } else {
        setActiveCanvasDoc(null);
        setCanvasOpen(false);
      }
      
      setIsSidebarOpen(false);
      userHasScrolledUpRef.current = false;
      setTimeout(() => {
        scrollToBottom('auto', true);
      }, 50);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
      setActiveCanvasDoc(null);
      setCanvasOpen(false);
    }

    const supabase = getSupabase();
    if (supabase && user) {
      try {
        await supabase
          .from('chat_history')
          .delete()
          .eq('id', sessionId);
      } catch (err) {
        console.error('Failed to delete session from Supabase:', err);
      }
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  if (!user) {
    return (
      <LoginScreen
        onLoginSuccess={(u) => {
          setUser(u);
          localStorage.setItem('davecore_active_user', JSON.stringify(u));
        }}
      />
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAF9F6] text-[#1F1F1E] flex flex-col items-center justify-center p-6 font-sans select-none">
        {/* Aesthetic backgrounds */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-100/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center gap-4 relative z-10 animate-pulse">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-xs font-mono tracking-widest text-gray-400 uppercase">MEMUAT PROFIL DAVECORE AI...</p>
        </div>
      </div>
    );
  }

  if (onboardingStep !== 'none') {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAF9F6] text-[#1F1F1E] flex flex-col items-center justify-center p-6 md:p-12 font-sans select-none overflow-y-auto">
        {/* Aesthetic backgrounds */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-purple-100/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-blue-100/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo & Nama AI di bagian atas onboarding */}
        <div className="relative z-10 flex items-center justify-center gap-3 mb-6">
          <img 
            src="/logo.png" 
            alt="DAVECORE AI Logo" 
            className="w-12 h-12 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="font-sans text-xl font-extrabold tracking-widest text-[#1F1F1E]">DAVECORE AI</span>
        </div>

        <AnimatePresence mode="wait">
          {onboardingStep === 'agreement' && (
            <motion.div
              key="agreement"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-2xl w-full flex flex-col justify-center items-center relative z-10 py-8"
            >
              <div className="flex justify-center mb-6">
                <span className="bg-purple-100/80 text-purple-800 text-[11px] font-mono px-4 py-1.5 rounded-full uppercase font-bold tracking-widest">PERSYARATAN & PRIVASI</span>
              </div>

              <h2 className="font-serif text-3xl md:text-5xl font-black text-[#1F1F1E] text-center mb-6 leading-tight tracking-tight">
                Persetujuan Akun Anda
              </h2>
              
              <div className="space-y-6 text-sm md:text-base text-gray-600/95 text-center max-w-xl mb-10 leading-relaxed">
                <p>
                  Selamat datang di <strong className="text-gray-900 font-serif">DAVECORE AI</strong>. Sebelum melanjutkan pembuatan profil, mohon menyetujui ketentuan privasi kami:
                </p>
                <div className="text-left bg-white/40 backdrop-blur-md border border-gray-150/40 rounded-[28px] p-6 md:p-8 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
                  <p className="flex items-start gap-3">
                    <span className="text-purple-600 font-bold shrink-0 text-base">✓</span>
                    <span><strong className="text-gray-800">Keamanan Data:</strong> Sesi percakapan Anda dienkripsi dan disimpan secara terisolasi.</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-purple-600 font-bold shrink-0 text-base">✓</span>
                    <span><strong className="text-gray-800">Sinkronisasi Cloud:</strong> Riwayat chat disinkronkan ke cloud agar dapat diakses dari perangkat mana pun.</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-purple-600 font-bold shrink-0 text-base">✓</span>
                    <span><strong className="text-gray-800">Kontrol Penuh:</strong> Anda dapat menghapus seluruh riwayat chat kapan saja melalui menu Setelan.</span>
                  </p>
                </div>
                <p className="text-[12px] text-gray-400 italic mt-4">
                  Dengan mengklik "Saya Setuju", Anda menyetujui pembuatan akun DAVECORE AI Anda dan sinkronisasi data terkait.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-4">
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = getSupabase();
                    if (supabase) {
                      try {
                        await supabase.auth.signOut();
                      } catch (e) {
                        console.error('Error signing out:', e);
                      }
                    }
                    setUser(null);
                    localStorage.removeItem('davecore_active_user');
                    setOnboardingStep('agreement');
                  }}
                  className="flex-1 py-4 border border-red-200 text-red-600 hover:bg-red-50/40 rounded-[200px] text-xs md:text-sm font-semibold transition-all cursor-pointer text-center"
                >
                  Tolak & Keluar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prefix = getStoragePrefix(user);
                    localStorage.setItem(`davecore_onboarding_agreed_${prefix}`, 'true');
                    setOnboardingStep('name');
                  }}
                  className="flex-1 py-4 bg-[#1F1F1E] hover:bg-black text-white rounded-[200px] text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  Saya Setuju <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {onboardingStep === 'name' && (
            <motion.div
              key="name-input"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-xl w-full flex flex-col justify-center items-center relative z-10 py-8"
            >
              <div className="flex justify-center mb-6">
                <span className="bg-blue-100/80 text-blue-800 text-[11px] font-mono px-4 py-1.5 rounded-full uppercase font-bold tracking-widest">PROFIL ANDA</span>
              </div>

              <h2 className="font-serif text-3xl md:text-5xl font-black text-[#1F1F1E] text-center mb-4 leading-tight tracking-tight">
                Siapa Nama Anda?
              </h2>
              <p className="text-sm md:text-base text-gray-500 text-center mb-10 leading-relaxed max-w-md">
                Silakan masukkan nama panggilan Anda untuk mempersonalisasi sapaan dan interaksi dengan DAVECORE AI.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (userName.trim()) {
                    handleSaveUserName(userName.trim());
                    const prefix = getStoragePrefix(user);
                    localStorage.setItem(`davecore_onboarding_agreed_${prefix}`, 'true');
                    setOnboardingStep('none');
                  }
                }}
                className="space-y-8 w-full max-w-md flex flex-col items-center"
              >
                <input
                  type="text"
                  placeholder="Masukkan nama panggilan..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full text-xl md:text-3xl font-serif text-center font-bold bg-transparent border-b-2 border-gray-200 focus:border-purple-600 outline-none pb-4 transition-all py-2 px-4 text-gray-800 placeholder:text-gray-300 placeholder:font-sans"
                  autoFocus
                  required
                />

                <div className="flex gap-4 w-full pt-4">
                  {!user && (
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingStep('agreement');
                      }}
                      className="flex-1 py-4 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-[200px] text-xs md:text-sm font-semibold transition-all cursor-pointer text-center"
                    >
                      Kembali
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-[#1F1F1E] hover:bg-black text-white rounded-[200px] text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Mulai Chatting <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const greetingText = `${getGreeting()}, ${userName || 'User'}`;
  const greetingWords = greetingText.split(' ');

  return (
    <div className="flex h-[100dvh] bg-claude-bg text-claude-text font-sans overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}
      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`fixed lg:relative z-50 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-[300px]' : '-translate-x-full w-[300px] lg:translate-x-0 lg:w-0'} bg-sidebar-bg border-r border-claude-border h-[100dvh] lg:h-full overflow-hidden flex-shrink-0`}>
        
        {/* Header Sidebar: DAVECORE */}
        <div className="flex items-center justify-start px-6 h-16 border-b border-claude-border/40 w-[300px] shrink-0 bg-sidebar-bg/50">
          <span className="font-serif text-[18px] font-extrabold tracking-widest text-[#1F1F1E] flex items-center gap-2">
            DAVECORE
          </span>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 w-[300px] pb-24 pt-4">
          {chatSessions.length > 0 && (
            <>
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-3 mb-2 mt-4">
                {localized.chatHistoryTitle}
              </div>
              <div className="space-y-1">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] transition-all ${
                      currentSessionId === session.id
                        ? 'bg-[#eae8e2] text-claude-text font-semibold shadow-sm'
                        : 'text-[#4e4d4a] hover:bg-sidebar-hover'
                    }`}
                  >
                    <button
                      onClick={() => handleLoadSession(session.id)}
                      className="flex-1 text-left truncate flex items-center gap-2.5 pr-2 cursor-pointer"
                    >
                      <MessageSquare size={14} className="text-gray-500 shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all text-gray-400 shrink-0 cursor-pointer"
                      title={localized.deleteChatTooltip}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 flex gap-3">
          <button 
            onClick={handleNewChat}
            className="flex-1 flex items-center justify-center gap-2.5 px-4 h-14 bg-blue-100 text-blue-700 rounded-[200px] hover:bg-blue-200 transition-all font-medium text-[15px] cursor-pointer"
          >
            <Pen size={16} />
            <span>{localized.newChat}</span>
          </button>
          
          <button 
            onClick={() => {
              setShowSettings(true);
              setConfirmDeleteAll(false);
              setIsSidebarOpen(false); // Auto close sidebar when Settings is opened
            }}
            className="w-14 h-14 flex items-center justify-center bg-transparent border border-gray-200 text-[#1F1F1E] rounded-full hover:bg-sidebar-hover transition-all shrink-0 cursor-pointer"
            title={localized.settings}
          >
            <Settings size={20} />
          </button>
        </div>
      </aside>

      {/* Split screen content area holding both Main Chat and File Canvas side-by-side */}
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Main Chat Area */}
        <main className={`flex-1 flex flex-col h-full relative min-w-0 ${canvasOpen ? 'border-r border-gray-200' : ''}`}>
        {showSettings ? (
          <SettingsComponent
            onBack={() => setShowSettings(false)}
            chatSessionsCount={chatSessions.length}
            totalMessagesCount={chatSessions.reduce((acc, s) => acc + s.messages.length, 0)}
            onClearHistory={async () => {
              setChatSessions([]);
              setCurrentSessionId(null);
              setMessages([]);
              const prefix = getStoragePrefix(user);
              try {
                localStorage.removeItem(`davecore_sessions_${prefix}`);
                localStorage.removeItem(`davecore_current_session_id_${prefix}`);
              } catch (e) {
                console.error(e);
              }

              const supabase = getSupabase();
              if (supabase && user) {
                try {
                  await supabase
                    .from('chat_history')
                    .delete()
                    .eq('user_id', user.id);
                } catch (err) {
                  console.error('Failed to clear chat history in Supabase:', err);
                }
              }
            }}
            theme={theme}
            setTheme={setTheme}
            appLang={appLang}
            setAppLang={setAppLang}
            memories={memories}
            onAddMemory={(m) => setMemories(prev => [...prev, m])}
            onDeleteMemory={(idx) => setMemories(prev => prev.filter((_, i) => i !== idx))}
            onSetMemories={setMemories}
            aiModel={aiModel}
            setAiModel={setAiModel}
            user={user}
            onLogout={async () => {
              const supabase = getSupabase();
              if (supabase) {
                try {
                  await supabase.auth.signOut();
                } catch (e) {
                  console.error('Error signing out:', e);
                }
              }
              setUser(null);
              localStorage.removeItem('davecore_active_user');
              setOnboardingStep('agreement');
            }}
            storagePrefix={getStoragePrefix(user)}
            userName={userName}
            onSaveUserName={handleSaveUserName}
            supabaseError={supabaseError}
            onSetSupabaseError={setSupabaseError}
          />
        ) : (
          <>
            {/* Header */}
            <header className="sticky top-0 h-14 flex items-center justify-between px-4 md:px-6 bg-claude-bg/95 backdrop-blur-md border-b border-claude-border/30 shrink-0 z-20">
              <div className="flex items-center gap-2">
                <button onClick={toggleSidebar} className="hidden lg:flex p-2 -ml-2 rounded-lg hover:bg-sidebar-hover text-muted" title="Buka Sidebar">
                  <PanelLeft size={20} />
                </button>
                <button onClick={toggleSidebar} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-sidebar-hover text-claude-text" title="Buka Menu">
                  <BarsStaggered size={20} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Custom requested New Chat button with FontAwesome icon */}
                <button
                  onClick={handleNewChat}
                  className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-all text-[#1F1F1E] dark:text-gray-300 cursor-pointer border-0"
                  title="Chat Baru"
                >
                  <i className="fa-solid fa-comment text-base"></i>
                </button>

                {user && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#eae8e2]/40 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200/30">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    <span className="truncate max-w-[120px]" title={user.email}>{user.email}</span>
                  </div>
                )}
              </div>
            </header>

            {/* Supabase Error Alert Banner */}
            {supabaseError && (
              <div className="bg-amber-50/90 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs z-10 animate-fadeIn shrink-0">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="font-medium">
                    {supabaseError === 'missing_tables' 
                      ? 'Sinkronisasi Supabase Non-aktif: Tabel database belum dibuat.' 
                      : `Gagal menyinkronkan chat ke Supabase: ${supabaseError}`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setConfirmDeleteAll(false);
                    setIsSidebarOpen(false);
                  }}
                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 rounded font-semibold transition-all cursor-pointer text-[10px]"
                >
                  {supabaseError === 'missing_tables' ? 'Konfigurasi SQL' : 'Lihat Detail'}
                </button>
              </div>
            )}

            {/* Chat Messages */}
            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 px-4 py-6 md:p-10 flex flex-col items-center overflow-y-auto">
              {messages.length === 0 ? (
                <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center py-10 md:py-16 text-center">
                  <motion.h1 
                    className="font-serif text-[28px] md:text-[38px] font-semibold text-[#1F1F1E] tracking-tight mb-8"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    {localized.welcome}<span className="text-claude-accent">{userName || localized.today}</span>?
                  </motion.h1>
                  
                  {/* Centered ChatInput inside welcome container */}
                  <div className="w-full">
                    <ChatInput onSend={handleSend} disabled={isTyping} placeholder={localized.placeholder} />
                  </div>

                  {/* Suggestions Cards underneath */}
                  <div className="flex flex-wrap gap-2.5 justify-center w-full mt-6 px-1 max-w-2xl mx-auto">
                    {localizedSuggestions.map((s, idx) => {
                      const Icon = s.iconName === 'Code2' ? Code2 : 
                                   s.iconName === 'PenTool' ? PenTool :
                                   s.iconName === 'Lightbulb' ? Lightbulb : BookOpen;
                      return (
                        <motion.button
                          key={idx}
                          onClick={() => handleSend(s.prompt)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200/80 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.96] text-[#1F1F1E] cursor-pointer"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.15 + idx * 0.05 }}
                        >
                          <Icon size={14} className="text-[#1F1F1E]/60 flex-shrink-0" />
                          <span className="text-[13px] font-medium leading-none">
                            {s.title}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-full md:px-6 lg:px-12 space-y-8 pb-32">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} onPreviewCode={setPreviewCode} onOpenCanvas={handleOpenCanvas} />
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            {messages.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 flex flex-col items-center bg-gradient-to-t from-claude-bg via-claude-bg to-transparent z-40">
                {/* Scroll to bottom button */}
                <AnimatePresence>
                  {showScrollBottomBtn && (
                    <motion.button
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      onClick={() => {
                        userHasScrolledUpRef.current = false;
                        scrollToBottom('smooth', true);
                        setShowScrollBottomBtn(false);
                      }}
                      className="absolute -top-5 left-1/2 -translate-x-1/2 p-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-zinc-100 transition-all flex items-center justify-center z-50 cursor-pointer w-9 h-9"
                      title="Scroll ke bawah"
                    >
                      <ArrowDown size={14} className="stroke-[2.5]" />
                    </motion.button>
                  )}
                </AnimatePresence>
                <ChatInput onSend={handleSend} disabled={isTyping} placeholder={localized.placeholder} />
                <div className="text-center mt-3 text-[11px] text-muted">
                  {localized.disclaimer}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* File Canvas Component (Side-panel overlay) */}
      {canvasOpen && activeCanvasDoc && (
        <CanvasPanel
          doc={activeCanvasDoc}
          onClose={() => setCanvasOpen(false)}
          onSave={(updatedContent) => handleSaveCanvasContent(activeCanvasDoc.id, updatedContent)}
          onRevision={(prompt) => handleRequestCanvasRevision(activeCanvasDoc, prompt)}
          isGenerating={isCanvasGenerating}
        />
      )}
      </div>

      {/* Preview Page Overlay */}
      {previewCode !== null && (
        <PreviewPage code={previewCode} onClose={() => setPreviewCode(null)} />
      )}
    </div>
  );
}
