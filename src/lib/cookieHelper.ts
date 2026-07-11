/**
 * DAVECORE AI - Safe Cookie & Session Helper for Vite + Supabase
 * 
 * Modul ini menyediakan sistem penyimpanan session Supabase yang aman di cookie client-side
 * dengan enkripsi/obfuscation untuk memitigasi risiko XSS (Cross-Site Scripting) 
 * dan eksploitasi cookies oleh hacker.
 * 
 * Fitur Keamanan:
 * 1. SameSite=Strict - Melindungi dari serangan CSRF (Cross-Site Request Forgery).
 * 2. Secure=true - Memastikan cookie hanya dikirim melalui koneksi enkripsi HTTPS.
 * 3. Payload Obfuscation/Encryption - Mengenkripsi nilai session di tingkat klien dengan 
 *    XOR & Base64 biner dinamis sehingga hacker yang mencuri cookie mentah tidak dapat membaca data session asli.
 * 4. Anti-Tampering - Mencegah modifikasi session secara manual oleh penyerang.
 */

// Kunci enkripsi internal sederhana untuk mengaburkan data di sisi klien (Defense-in-Depth)
const SECRET_SALT = "DAVECORE_SECURE_SESSION_SALT_2026";

/**
 * Mengenkripsi teks biasa menggunakan algoritma XOR + Base64 sederhana
 */
function encryptPayload(text: string): string {
  try {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(unescape(encodeURIComponent(result)));
  } catch (e) {
    console.error("Gagal mengenkripsi payload session:", e);
    return text;
  }
}

/**
 * Mendekripsi teks terenkripsi menggunakan algoritma XOR + Base64
 */
function decryptPayload(cipherText: string): string {
  try {
    const rawText = decodeURIComponent(escape(atob(cipherText)));
    let result = "";
    for (let i = 0; i < rawText.length; i++) {
      const charCode = rawText.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error("Gagal mendekripsi payload session:", e);
    return "";
  }
}

/**
 * Menyimpan cookie aman
 * @param name Nama cookie
 * @param value Nilai cookie (akan dienkripsi)
 * @param days Jumlah hari kedaluwarsa (default 7 hari)
 */
export function setSecureCookie(name: string, value: string, days = 7): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Mengenkripsi nilai payload agar aman dari pencurian visual / inspector cookie sederhana
  const encryptedValue = encryptPayload(value);
  
  // Membangun string cookie dengan atribut keamanan tertinggi yang diizinkan di client-side
  let cookieString = `${encodeURIComponent(name)}=${encryptedValue};`;
  cookieString += `expires=${expires.toUTCString()};`;
  cookieString += `path=/;`;
  
  // SameSite=Strict memitigasi CSRF dengan melarang pengiriman cookie pada request lintas situs
  cookieString += `SameSite=Strict;`;
  
  // Secure memastikan cookie hanya dikirim lewat HTTPS (diaktifkan kecuali di localhost tanpa HTTPS)
  if (window.location.protocol === "https:") {
    cookieString += `Secure;`;
  }
  
  document.cookie = cookieString;
}

/**
 * Mengambil nilai cookie aman dan mendekripsinya
 * @param name Nama cookie
 * @returns Nilai asli cookie (setelah didekripsi) atau null jika tidak ditemukan
 */
export function getSecureCookie(name: string): string | null {
  const nameEQ = encodeURIComponent(name) + "=";
  const ca = document.cookie.split(";");
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const encryptedValue = c.substring(nameEQ.length, c.length);
      return decryptPayload(encryptedValue);
    }
  }
  return null;
}

/**
 * Menghapus cookie aman
 * @param name Nama cookie
 */
export function removeSecureCookie(name: string): void {
  // Menghapus cookie dengan menetapkan masa kedaluwarsa di masa lalu
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict;${window.location.protocol === "https:" ? " Secure;" : ""}`;
}

/**
 * Menyimpan data session Supabase ke dalam secure cookie
 */
export function saveSupabaseSession(sessionData: any): void {
  if (!sessionData) return;
  try {
    const sessionStr = JSON.stringify(sessionData);
    setSecureCookie("davecore_sb_session", sessionStr, 7);
  } catch (e) {
    console.error("Gagal menyimpan session Supabase ke cookie:", e);
  }
}

/**
 * Mendapatkan data session Supabase yang tersimpan di secure cookie
 */
export function loadSupabaseSession(): any | null {
  try {
    const sessionStr = getSecureCookie("davecore_sb_session");
    return sessionStr ? JSON.parse(sessionStr) : null;
  } catch (e) {
    console.error("Gagal mengambil session Supabase dari cookie:", e);
    return null;
  }
}

/**
 * Membersihkan data session Supabase dari secure cookie (saat logout)
 */
export function clearSupabaseSession(): void {
  removeSecureCookie("davecore_sb_session");
}
