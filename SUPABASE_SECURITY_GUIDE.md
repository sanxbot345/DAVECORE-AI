# 🛡️ Panduan Keamanan Database Supabase (DAVECORE AI)

Panduan ini menjelaskan langkah demi langkah untuk mengamankan database Supabase Anda dari hacker, pencurian data, dan eksploitasi API menggunakan **Row Level Security (RLS)** dan **Policies**.

---

## 🚨 Mengapa Supabase Harus Diamankan?
Secara default, jika Anda membuat tabel di Supabase, semua orang yang memiliki `anon_key` (yang berada di aplikasi client-side/Vite Anda) dapat melakukan query, membaca, mengedit, atau menghapus baris data di tabel tersebut.
**RLS (Row Level Security)** memaksa database memeriksa setiap baris data dan mencocokkannya dengan aturan keamanan sebelum mengizinkan akses.

---

## 🛠️ Langkah 1: Aktifkan Row Level Security (RLS)

Anda wajib menyalakan RLS untuk **setiap tabel** yang Anda buat di Supabase.

### Melalui Supabase Dashboard:
1. Buka **Supabase Dashboard** Anda.
2. Pergi ke **Database** > **Tables**.
3. Pilih tabel yang ingin diamankan (contoh: tabel `messages`, `sessions`, atau `users`).
4. Klik tombol **RLS** (di bagian kanan atas atau pengaturan tabel).
5. Klik **Enable RLS**.

### Melalui SQL Editor (Sangat Direkomendasikan):
Jalankan perintah SQL ini di SQL Editor Supabase Anda untuk mengaktifkan RLS secara instan:

```sql
-- Aktifkan RLS untuk tabel message / chat history
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Aktifkan RLS untuk tabel sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
```

---

## ✍️ Langkah 2: Buat Keamanan Policies (Kebijakan Akses)

Setelah RLS diaktifkan, **tidak ada satu pun request** dari client-side yang bisa membaca atau menulis data sebelum Anda membuat Policy (Kebijakan).

Berikut adalah SQL Policies terbaik untuk mengamankan data pengguna berdasarkan ID Pengguna Supabase Auth (`auth.uid()`):

### 1. Kebijakan untuk Tabel `sessions` (Daftar Sesi Obrolan)
Pengguna hanya boleh melihat, membuat, mengubah, dan menghapus sesi obrolan miliknya sendiri.

```sql
-- Kebijakan untuk Membaca Sesi (SELECT)
CREATE POLICY "Pengguna hanya dapat membaca sesi milik sendiri" 
ON sessions 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Kebijakan untuk Menulis Sesi Baru (INSERT)
CREATE POLICY "Pengguna hanya dapat membuat sesi untuk dirinya sendiri" 
ON sessions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Kebijakan untuk Mengubah Sesi (UPDATE)
CREATE POLICY "Pengguna hanya dapat memperbarui sesi miliknya sendiri" 
ON sessions 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Kebijakan untuk Menghapus Sesi (DELETE)
CREATE POLICY "Pengguna hanya dapat menghapus sesi miliknya sendiri" 
ON sessions 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
```

### 2. Kebijakan untuk Tabel `messages` (Detail Pesan Chat)
Sama seperti sesi, pesan chat hanya boleh diakses oleh pemiliknya. Jika tabel `messages` berelasi dengan tabel `sessions`, kita bisa mengamankannya secara langsung menggunakan relasi userid:

```sql
-- Kebijakan SELECT pesan
CREATE POLICY "Pengguna hanya dapat membaca pesan miliknya" 
ON messages 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Kebijakan INSERT pesan
CREATE POLICY "Pengguna hanya dapat mengirim pesan miliknya" 
ON messages 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Kebijakan DELETE pesan
CREATE POLICY "Pengguna hanya dapat menghapus pesan miliknya" 
ON messages 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
```

---

## 🛡️ Langkah 3: Tips Keamanan Tambahan untuk Menghindari Hacker

### 1. Jangan Pernah Mengekspos `service_role_key`
Di Supabase, ada dua jenis API key:
- `anon_key` (Aman dipasang di browser/Vite, asalkan RLS aktif).
- `service_role_key` (**SANGAT RAHASIA!** Melewati semua aturan RLS. Jika hacker mendapatkan ini, mereka menguasai seluruh database Anda. Jangan pernah menaruh key ini di file `.env` client-side atau kode Vite Anda!).

### 2. Gunakan `auth.uid()` di Postgres, Jangan Percaya ID dari Client-Side
Saat melakukan INSERT data dari Vite, jangan mengizinkan user menentukan `user_id` sembarangan di filter RLS. Supabase secara otomatis mencocokkan token JWT user. Dengan menggunakan formula `auth.uid() = user_id` di Policy RLS, database akan otomatis menolak request jika `user_id` yang dikirim dari klien berbeda dengan identitas user asli yang sedang login.

### 3. Validasi Email Domain (Jika Perlu)
Jika Anda hanya ingin mengizinkan login dengan email tertentu (misal email pribadi Anda), Anda bisa mengaturnya di menu **Authentication** > **Providers** > **Email** di dashboard Supabase, atau membuat DB Trigger untuk menolak pendaftaran baru.

---

## 🚀 Cara Menjalankan SQL ini di Supabase Anda:
1. Masuk ke **[Dashboard Supabase](https://supabase.com/)**.
2. Klik proyek Anda.
3. Di bilah navigasi kiri, pilih **SQL Editor** (ikon `>_`).
4. Klik **New Query**.
5. Copy-paste kode SQL di atas, lalu klik **Run** (tombol hijau).
6. Selesai! Database Anda sekarang terlindungi sepenuhnya dengan keamanan militer (RLS & Policies).
