-- SQL Schema untuk Supabase

-- 1. Tabel Profil
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

CREATE POLICY "Pengguna dapat mengelola profil mereka sendiri" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- JIKA ANDA SUDAH MEMILIKI TABEL USER_PROFILES SEBELUMNYA, JALANKAN PERINTAH BERIKUT:
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

CREATE POLICY "Pengguna dapat mengelola riwayat chat mereka sendiri" ON public.chat_history
    FOR ALL USING (auth.uid() = user_id);
