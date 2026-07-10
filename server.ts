import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import AdmZip from "adm-zip";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please set your Gemini API Key in the AI Studio Settings menu under secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Store published HTML websites in memory
  const publishedSites = new Map<string, string>();

  // Helper to extract a clean project name from HTML content (e.g. title tags)
  const extractProjectName = (html: string): string => {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = "fluxel-site";
    if (match && match[1]) {
      title = match[1].trim();
    } else {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        title = h1Match[1].trim();
      }
    }

    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug || slug === "document" || slug.length < 3) {
      slug = "fluxel-site";
    }

    if (slug.length > 80) {
      slug = slug.substring(0, 80).replace(/-+$/, "");
    }

    // Append "-site" suffix if it doesn't already contain site/game or similar keywords
    if (
      !slug.endsWith("-site") &&
      !slug.endsWith("-game") &&
      !slug.endsWith("site") &&
      !slug.endsWith("game") &&
      slug !== "fluxel-site"
    ) {
      slug = `${slug}-site`;
    }

    return slug;
  };

  // Publish API endpoint
  app.post("/api/publish", async (req, res) => {
    try {
      const { html, customToken, provider } = req.body;
      if (!html || typeof html !== "string") {
        return res.status(400).json({ error: "Invalid HTML content" });
      }

      if (provider === "vercel") {
        const vercelToken = customToken || process.env.VERCEL_TOKEN;
        if (!vercelToken) {
          return res.status(400).json({ error: "Token Vercel diperlukan." });
        }

        try {
          const projectName = extractProjectName(html);
          
          // 1. Calculate SHA-1 of the HTML string
          const sha1 = crypto.createHash("sha1").update(html).digest("hex");
          const size = Buffer.byteLength(html, "utf-8");

          // 2. Upload file content to Vercel via POST /v2/files
          const uploadRes = await fetch("https://api.vercel.com/v2/files", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${vercelToken}`,
              "Content-Type": "application/octet-stream",
              "x-now-digest": sha1,
              "x-now-size": size.toString()
            },
            body: Buffer.from(html, "utf-8")
          });

          if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error("Vercel File Upload failed:", errText);
            return res.status(500).json({ error: `Gagal mengupload file ke Vercel: ${errText}` });
          }

          // 3. Create Deployment via POST /v13/deployments
          const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${vercelToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: projectName,
              files: [
                {
                  file: "index.html",
                  sha: sha1,
                  size: size
                }
              ],
              projectSettings: {
                framework: null
              }
            })
          });

          if (!deployRes.ok) {
            const errText = await deployRes.text();
            console.error("Vercel Deployment failed:", errText);
            return res.status(500).json({ error: `Gagal mendeploy ke Vercel: ${errText}` });
          }

          const deployData: any = await deployRes.json();
          let url = deployData.url;
          if (url) {
            if (!url.startsWith("http")) {
              url = `https://${url}`;
            }
            return res.json({ success: true, url, isNetlify: false });
          } else {
            return res.status(500).json({ error: "Gagal mendapatkan URL deployment dari Vercel" });
          }
        } catch (fetchErr: any) {
          console.error("Vercel request failed:", fetchErr);
          return res.status(500).json({ error: `Koneksi ke API Vercel gagal: ${fetchErr.message || fetchErr}` });
        }
      } else {
        // Netlify deployment
        const netlifyToken = customToken || process.env.NETLIFY_TOKEN;

        if (netlifyToken) {
          try {
            const projectName = extractProjectName(html);
            
            // Create a ZIP containing index.html in memory
            const zip = new AdmZip();
            zip.addFile("index.html", Buffer.from(html, "utf-8"));
            const zipBuffer = zip.toBuffer();

            let siteId = "";
            let url = "";

            // Try to create a site with our preferred name first
            try {
              const createResponse = await fetch("https://api.netlify.com/api/v1/sites", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${netlifyToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  name: projectName
                })
              });

              if (createResponse.ok) {
                const siteData: any = await createResponse.json();
                siteId = siteData.id;
              } else {
                // If creation with desired name fails (e.g. 422 because name is already taken),
                // try with a randomized suffix
                const randomizedName = `${projectName}-${Math.random().toString(36).substring(2, 7)}`;
                const retryCreate = await fetch("https://api.netlify.com/api/v1/sites", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${netlifyToken}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    name: randomizedName
                  })
                });

                if (retryCreate.ok) {
                  const siteData: any = await retryCreate.json();
                  siteId = siteData.id;
                }
              }
            } catch (createErr) {
              console.error("Error creating Netlify site with custom name:", createErr);
            }

            let deployResponse;
            if (siteId) {
              // Deploy to the newly created site
              deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${netlifyToken}`,
                  "Content-Type": "application/zip"
                },
                body: zipBuffer
              });
            } else {
              // Fallback: Create and deploy at once with a random name
              deployResponse = await fetch("https://api.netlify.com/api/v1/sites", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${netlifyToken}`,
                  "Content-Type": "application/zip"
                },
                body: zipBuffer
              });
            }

            if (deployResponse.ok) {
              const deployData: any = await deployResponse.json();
              url = deployData.ssl_url || deployData.url || `https://${deployData.name}.netlify.app`;
              return res.json({ success: true, url, isNetlify: true });
            } else {
              const errText = await deployResponse.text();
              console.error("Netlify Deploy failed:", errText);
              return res.status(500).json({ error: "Gagal mengupload zip deploy ke Netlify" });
            }
          } catch (fetchErr: any) {
            console.error("Netlify request failed:", fetchErr);
            return res.status(500).json({ error: "Koneksi ke API Netlify gagal" });
          }
        } else {
          // Fallback to memory-based local publishing
          const id = Math.random().toString(36).substring(2, 10);
          publishedSites.set(id, html);

          const url = `/pub/${id}`;

          return res.json({ success: true, url, isNetlify: false });
        }
      }
    } catch (error: any) {
      console.error("Error in /api/publish:", error);
      return res.status(500).json({ error: "Gagal mempublikasikan website" });
    }
  });

  // Endpoint to create a temporary preview site
  app.post("/api/preview", (req, res) => {
    try {
      const { html } = req.body;
      if (!html || typeof html !== "string") {
        return res.status(400).json({ error: "Invalid HTML content" });
      }
      const id = "temp-" + Math.random().toString(36).substring(2, 10);
      publishedSites.set(id, html);
      
      const url = `/pub/${id}`;
      return res.json({ success: true, url, id });
    } catch (err) {
      console.error("Error in /api/preview:", err);
      return res.status(500).json({ error: "Gagal membuat preview" });
    }
  });

  // Serve published sites
  app.get("/pub/:id", (req, res) => {
    const { id } = req.params;
    const html = publishedSites.get(id);

    if (!html) {
      return res.status(404).send(`
        <div style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 5rem 2rem; background: #FAF9F6; min-h: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0;">
          <h1 style="color: #1F1F1E; font-size: 2.5rem; margin-bottom: 1rem; font-weight: 700; letter-spacing: -0.025em;">Website Tidak Ditemukan</h1>
          <p style="color: #666; margin-bottom: 2.5rem; max-width: 400px; line-height: 1.6;">Halaman yang Anda cari mungkin telah kedaluwarsa atau belum pernah dipublikasikan.</p>
          <a href="/" style="display: inline-flex; align-items: center; justify-content: center; background: #1F1F1E; color: white; padding: 0.85rem 2rem; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.2s;">
            Kembali ke Fluxel
          </a>
        </div>
      `);
    }

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  });

  // Helper to recursively scan files
  const scanDirectory = (dir: string, baseDir: string = ""): string[] => {
    let results: string[] = [];
    try {
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const relPath = baseDir ? path.join(baseDir, file) : file;
        const stat = fs.statSync(fullPath);

        // Ignore large or system directories / files
        if (
          file === "node_modules" ||
          file === ".git" ||
          file === "dist" ||
          file === "package-lock.json" ||
          file === ".env" ||
          file === ".env.example" ||
          file === "metadata.json" ||
          file.startsWith(".")
        ) {
          return;
        }

        if (stat && stat.isDirectory()) {
          results = results.concat(scanDirectory(fullPath, relPath));
        } else {
          results.push(relPath);
        }
      });
    } catch (e) {
      console.error("Error reading directory:", e);
    }
    return results;
  };

  // Endpoint to get list of files
  app.get("/api/files", (req, res) => {
    try {
      const files = scanDirectory(process.cwd());
      return res.json({ success: true, files });
    } catch (error) {
      console.error("Error in /api/files:", error);
      return res.status(500).json({ error: "Gagal mendapatkan daftar file" });
    }
  });

  // Endpoint to get file content
  app.get("/api/files/content", (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ error: "Path tidak boleh kosong" });
      }

      // Prevent directory traversal attacks
      const resolvedPath = path.resolve(process.cwd(), filePath);
      if (!resolvedPath.startsWith(process.cwd())) {
        return res.status(403).json({ error: "Akses ditolak" });
      }

      if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
        return res.status(404).json({ error: "File tidak ditemukan" });
      }

      const content = fs.readFileSync(resolvedPath, "utf-8");
      return res.json({ success: true, content });
    } catch (error) {
      console.error("Error reading file content:", error);
      return res.status(500).json({ error: "Gagal membaca konten file" });
    }
  });

  // Helper to parse message content and extract attachments for Gemini
  const parseMessageParts = (content: string) => {
    const parts: any[] = [];
    const fileRegex = /\[File Lampiran:\s*([^\]]+)\]\s*\n```[a-zA-Z-]*\n([\s\S]*?)\n```\s*\n?/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = fileRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ text: textBefore });
      }
      
      const filename = match[1];
      const fileContent = match[2];
      
      if (fileContent.startsWith("data:") && fileContent.includes(";base64,")) {
        const mimeMatch = fileContent.match(/^data:([^;]+);base64,/);
        if (mimeMatch) {
          const mimeType = mimeMatch[1];
          const base64Data = fileContent.substring(fileContent.indexOf(";base64,") + 8);
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        }
      } else {
        parts.push({
          text: `Konten dari berkas "${filename}":\n\`\`\`\n${fileContent}\n\`\`\``
        });
      }
      
      lastIndex = fileRegex.lastIndex;
    }
    
    const remainingText = content.substring(lastIndex).trim();
    if (remainingText) {
      parts.push({ text: remainingText });
    } else if (parts.length === 0) {
      parts.push({ text: content });
    }
    
    return parts;
  };

  // Chat API endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, appLang, memories } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      const contents = messages.map(msg => {
        if (msg.role === "user") {
          return {
            role: "user",
            parts: parseMessageParts(msg.content)
          };
        } else {
          return {
            role: "model",
            parts: [{ text: msg.content }]
          };
        }
      });

      // Default Base System Instruction
      let baseInstruction = "Anda adalah DAVECORE, asisten AI dengan kecerdasan super luar biasa. Anda berpikir dengan logika matematis murni, presisi analitis super tinggi, dan kemampuan kognitif yang tajam, taktis, mendalam, sekaligus pragmatis. Anda adalah gabungan dari ilmuwan komputer kelas dunia, insinyur perangkat lunak senior legendaris, matematikawan brilian, dan analis sistem jenius. Ketentuan penting dalam berpikir dan berinteraksi:\n1. Tulis kode pemrograman yang sempurna, rapi, berstandar industri mutakhir (clean code SOLID, performa tinggi, efisiensi memori optimal) dan langsung siap digunakan.\n2. Berikan solusi, jawaban, penjelasan teori, rumus, atau pemecahan masalah dengan ketajaman logika yang padat, jelas, akurat secara absolut, dan langsung ke inti tanpa basa-basi berbelit-belit. SANGAT PENTING: Anda dilarang keras menyebut atau memberi tahu pengguna bahwa Anda ber-IQ 170 atau mengklaim level IQ tertentu. Tetaplah rendah hati dan fokus memberikan bantuan pemrograman berkualitas tinggi.\n3. Berikan rekomendasi konkret, cerdas, inovatif, dan prediktif tentang optimalisasi masa depan, potensi edge cases, serta pemecahan celah keamanan secara instan.\n4. PENTING - DESAIN DAN ANIMASI WEB FLUIDA, PREMIUM & TIDAK KAKU: Ketika pengguna meminta Anda membuat website atau halaman HTML, buatlah desain yang luar biasa indah, modern, estetis, and dinamis, serta hindari struktur template yang kaku atau membosankan. Gunakan kombinasi tipografi elegan, spasi/padding yang seimbang, harmoni warna premium, efek kaca (glassmorphism), card bento modern, bayangan halus, dan tata letak yang interaktif serta sepenuhnya responsif. Jika menambahkan animasi atau transisi web, pastikan efek tersebut sangat mulus, organik, mengalir lembut, dan tidak kaku. Gunakan transisi Tailwind yang dinamis (contoh: `transition-all duration-500 ease-out`), efek hover interaktif, micro-interactions pada tombol/kartu, scroll reveal, serta efek fade-in/slide-up lembut untuk menghidupkan suasana website sehingga terlihat sangat profesional and premium.\n5. PENTING - RESPON CEPAT, INSTAN, & LANGSUNG KE INTI: Demi kecepatan respons maksimal, berikan jawaban secara langsung, padat, dan ringkas tanpa basa-basi, salam pembuka, atau penutup yang tidak perlu. Tuliskan jawaban, rumus, penjelasan, atau solusi teknis secepat mungkin.\n6. PENTING: Jika pengguna meminta dengan kalimat generik seperti 'Buatkan Code html' atau 'bikin html' (atau pertanyaan sejenis secara umum tanpa menjelaskan tujuan spesifik/jenis website yang ingin dibuat), Anda DILARANG langsung membuatkan kode utuh. Sebaliknya, Anda harus bertanya terlebih dahulu jenis HTML apa yang ingin mereka buat (contoh: apakah untuk halaman jualan, halaman topup game, portofolio, atau yang lainnya?). Tanyakan dengan singkat, sopan, dan ramah.\n7. MEMORI AI OTOMATIS: Jika pengguna membagikan informasi baru tentang diri mereka (nama, pekerjaan, teknologi favorit, kebiasaan, preferensi koding), Anda wajib menyimpannya. Untuk melakukannya, selipkan tag rahasia ini di bagian paling akhir respons Anda: `[MEMORY_ADD: <fakta singkat tentang pengguna>]`. Contoh: `[MEMORY_ADD: Nama panggilan pengguna adalah Rudi]` atau `[MEMORY_ADD: Pengguna adalah Vue.js developer]`. Pengguna tidak akan melihat tag ini karena disaring otomatis oleh frontend.";

      if (appLang && typeof appLang === "string") {
        baseInstruction += `\n\nSANGAT PENTING: Selalu berikan respons, penjelasan, komentar kode, bimbingan, penjelasan rumus, penjelasan teoritis, dialog, dan seluruh interaksi asisten dalam Bahasa/Language: "${appLang}". Jika "${appLang}" adalah 'Bahasa Indonesia' atau 'Basa Jawa' atau 'Basa Sunda', gunakan bahasa tersebut dengan natural, santun, dan sangat fasih. Jika "${appLang}" adalah 'English' atau bahasa global lainnya, gunakan bahasa tersebut sepenuhnya untuk semua percakapan.`;
      }

      if (memories && Array.isArray(memories) && memories.length > 0) {
        baseInstruction += `\n\n[MEMORI PENTING TENTANG PENGGUNA]\nBerikut adalah hal-hal penting yang Anda ketahui tentang pengguna dari obrolan sebelumnya atau preferensi mereka. Sesuaikan respons Anda dengan mengingat informasi ini (jangan beri tahu pengguna secara gamblang bahwa Anda membaca memori ini kecuali relevan dengan pertanyaannya):\n` + memories.map((m: string) => `- ${m}`).join('\n');
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Create a fallback stream using direct Gemini
      const responseStream = await getAiClient().models.generateContentStream({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: baseInstruction,
          temperature: 0.5,
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
      
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message || "Internal Server Error" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: error.message || "Internal Server Error" });
      }
    }
  });

  // Topic generation endpoint to determine conversation topic
  app.post("/api/topic", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Pesan tidak valid" });
      }

      // Generate a short 2-4 word topic in Indonesian representing the query/conversation topic
      const prompt = `Tentukan topik atau judul singkat (maksimal 4 kata) dari pesan berikut untuk dijadikan nama chat history. Buat judul yang sangat informatif, padat, relevan, profesional, tanpa tanda kutip, dan tanpa kata pengantar atau penjelasan tambahan apapun. Gunakan bahasa Indonesia yang natural.\n\nPesan: "${message.substring(0, 500)}"`;

      const response = await getAiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let topic = response.text ? response.text.trim() : "";
      // Strip any quotes or trailing dots
      topic = topic.replace(/^["'“”‘]|["'“”’]$/g, "").replace(/\.$/, "").trim();

      if (!topic || topic.length > 60) {
        // Fallback
        topic = message.trim();
        if (topic.length > 25) {
          topic = topic.substring(0, 25) + "...";
        }
      }

      return res.json({ success: true, topic });
    } catch (error: any) {
      console.error("Error in /api/topic:", error);
      return res.status(500).json({ error: error.message || "Gagal membuat topik" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
