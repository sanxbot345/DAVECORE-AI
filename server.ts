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

/**
 * Calculates a basic keyword overlap similarity between a query and a text block
 * as a robust local search fallback.
 */
function computeKeywordSimilarity(query: string, text: string): number {
  const qWords = new Set(query.toLowerCase().match(/\w+/g) || []);
  const tWords = text.toLowerCase().match(/\w+/g) || [];
  if (qWords.size === 0 || tWords.length === 0) return 0;
  let matches = 0;
  for (const word of tWords) {
    if (qWords.has(word)) {
      matches++;
    }
  }
  return matches / (qWords.size + new Set(tWords).size);
}

/**
 * Fetches an embedding vector for a single text using nvidia/llama-nemotron-embed-vl-1b-v2:free
 */
async function getEmbedding(text: string, openRouterKey: string): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
      input: text
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter Embedding failed: ${await response.text()}`);
  }

  const data: any = await response.json();
  const embedding = data.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("No embedding returned from OpenRouter.");
  }
  return embedding;
}

/**
 * Fetches embedding vectors for multiple texts in batch using nvidia/llama-nemotron-embed-vl-1b-v2:free
 */
async function getEmbeddings(inputs: string[], openRouterKey: string): Promise<number[][]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
      input: inputs
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter Embedding batch failed: ${await response.text()}`);
  }

  const data: any = await response.json();
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error("Invalid embedding response data format.");
  }
  return data.data.map((item: any) => item.embedding);
}

/**
 * Score relevance using Llama Nemotron Rerank model via OpenRouter
 */
async function getRerankScores(query: string, passages: string[], openRouterKey: string): Promise<number[]> {
  const prompt = `Anda adalah AI Reranker yang sangat presisi. Tugas Anda adalah mengurutkan dokumen berikut berdasarkan relevansi tertinggi dengan kueri: "${query}".
Berikan skor angka bulat dari 0 sampai 100 untuk masing-masing dokumen. Respons Anda HARUS berupa JSON murni tanpa markdown, tanpa penjelasan tambahan, dengan format seperti berikut:
[
  {"index": 0, "score": 95},
  {"index": 1, "score": 30}
]

Dokumen yang perlu dinilai:
${passages.map((p, idx) => `[Dokumen ${idx}]\n${p}`).join("\n\n")}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ais-dev-wfqrxi4wbhw7mm2x3nhl45-540282209117.asia-southeast1.run.app",
      "X-Title": "DAVECORE"
    },
    body: JSON.stringify({
      model: "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter Reranker failed: ${await response.text()}`);
  }

  const data: any = await response.json();
  const textContent = data.choices?.[0]?.message?.content;
  if (!textContent) {
    throw new Error("No content returned from OpenRouter Reranker.");
  }

  const cleanText = textContent.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleanText);
  const scores = new Array(passages.length).fill(0);
  const array = Array.isArray(parsed) ? parsed : (parsed.scores || []);
  for (const item of array) {
    if (typeof item.index === "number" && typeof item.score === "number") {
      scores[item.index] = item.score;
    }
  }
  return scores;
}

/**
 * Score relevance using Gemini as a robust fallback reranker
 */
async function getRerankScoresWithGemini(query: string, passages: string[]): Promise<number[]> {
  const prompt = `Anda adalah AI Reranker yang sangat presisi. Tugas Anda adalah mengurutkan dokumen berikut berdasarkan relevansi tertinggi dengan kueri: "${query}".
Berikan skor angka bulat dari 0 sampai 100 untuk masing-masing dokumen. Respons Anda HARUS berupa JSON array murni:
[
  {"index": 0, "score": 95},
  {"index": 1, "score": 30}
]

Dokumen yang perlu dinilai:
${passages.map((p, idx) => `[Dokumen ${idx}]\n${p}`).join("\n\n")}`;

  const response = await getAiClient().models.generateContent({
    model: "gemini-3.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  });

  const textContent = response.text;
  if (!textContent) return new Array(passages.length).fill(0);
  
  const cleanText = textContent.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleanText);
  const scores = new Array(passages.length).fill(0);
  const array = Array.isArray(parsed) ? parsed : (parsed.scores || []);
  for (const item of array) {
    if (typeof item.index === "number" && typeof item.score === "number") {
      scores[item.index] = item.score;
    }
  }
  return scores;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Store published HTML websites in memory
  const publishedSites = new Map<string, string>();

  // Helper to extract a clean project name from HTML content
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
          const sha1 = crypto.createHash("sha1").update(html).digest("hex");
          const size = Buffer.byteLength(html, "utf-8");

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
            const zip = new AdmZip();
            zip.addFile("index.html", Buffer.from(html, "utf-8"));
            const zipBuffer = zip.toBuffer();

            let siteId = "";
            let url = "";

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
              deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${netlifyToken}`,
                  "Content-Type": "application/zip"
                },
                body: zipBuffer
              });
            } else {
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

      // Chat API endpoint upgraded to AI Agent
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, appLang, memories, customInstructions, toneStyle } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Helper function to stream chunks to client
      const streamText = (text: string) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      };

      const lastUserMessageObj = [...messages].reverse().find(m => m.role === "user");
      const lastUserMessage = lastUserMessageObj ? lastUserMessageObj.content : "";

      // 1. Core Planning using Gemini-3.5-Flash
      let planObj: any = { requires_tools: false, thought_process: "", steps: [], use_tool: null, tool_arg: "" };
      try {
        const planningPrompt = `Anda adalah Core Orchestrator dari Agent DAVECORE. Analisis pesan terbaru dari pengguna berikut:
"${lastUserMessage}"

Tugas Anda adalah merencanakan apakah kita perlu mengakses berkas proyek atau melakukan pencarian web untuk menjawab pertanyaan ini dengan sangat cerdas dan tepat. Anda memiliki akses ke beberapa tool berikut:
- list_workspace_files: Gunakan jika pengguna bertanya tentang struktur berkas, daftar komponen, letak file, atau daftar berkas secara keseluruhan di workspace proyek ini.
- read_file: Gunakan jika Anda tahu persis nama berkas spesifik di workspace yang ingin dibaca (contoh: "server.ts", "package.json").
- semantic_search_codebase: Gunakan jika pengguna menanyakan logika kode, cara kerja komponen, mencari letak bagian kode, atau menanyakan fungsi tertentu di dalam codebase workspace (sangat direkomendasikan untuk pencarian kontekstual).
- web_search: Gunakan jika pengguna menanyakan informasi terkini, fakta dunia nyata di luar codebase (seperti olahraga, berita hari ini, harga btc/saham, tren teknologi terbaru, cuaca, penjelasan umum di luar workspace, dll.) yang memerlukan penelusuran web waktu-nyata (sangat direkomendasikan untuk pertanyaan non-codebase aktual).

Jika pertanyaan bersifat umum (misal: "Halo", "Bantu saya belajar fisika", "Apa itu API?") yang tidak memerlukan konten berkas proyek Anda atau penelusuran web khusus, set "requires_tools" menjadi false.

Format respons Anda HARUS berupa JSON murni dengan format:
{
  "requires_tools": boolean,
  "thought_process": "Penjelasan singkat rencana tindakan Anda dalam Bahasa Indonesia",
  "steps": ["Langkah 1...", "Langkah 2..."],
  "use_tool": "list_workspace_files" | "read_file" | "semantic_search_codebase" | "web_search" | null,
  "tool_arg": "Argumen string untuk tool (nama file lengkap, kueri pencarian codebase, atau kueri pencarian web)"
}`;

        const planResult = await getAiClient().models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ role: "user", parts: [{ text: planningPrompt }] }],
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        });

        if (planResult.text) {
          const cleanPlanText = planResult.text.replace(/```json|```/g, "").trim();
          planObj = JSON.parse(cleanPlanText);
        }
      } catch (err: any) {
        console.error("Planning error, falling back to direct answering:", err);
      }

      // Stream planning information to client first
      res.write(`data: ${JSON.stringify({ planning: planObj })}\n\n`);

      let retrievedContext = "";
      let useWebSearch = false;

      if (planObj.requires_tools && planObj.use_tool) {
        let toolExecutionStatus = {
          name: planObj.use_tool,
          arg: planObj.tool_arg,
          status: 'executing' as 'executing' | 'success' | 'failed',
          resultSummary: ''
        };
        res.write(`data: ${JSON.stringify({ toolStatus: toolExecutionStatus })}\n\n`);

        try {
          if (planObj.use_tool === "list_workspace_files") {
            const files = scanDirectory(process.cwd());
            retrievedContext = `Daftar Berkas di Proyek:\n${files.join("\n")}`;
            toolExecutionStatus.status = 'success';
            toolExecutionStatus.resultSummary = `Berhasil mendaftar ${files.length} berkas proyek di workspace.`;

          } else if (planObj.use_tool === "read_file") {
            const fileName = planObj.tool_arg;
            const resolvedPath = path.resolve(process.cwd(), fileName);
            if (resolvedPath.startsWith(process.cwd()) && fs.existsSync(resolvedPath) && !fs.statSync(resolvedPath).isDirectory()) {
              const content = fs.readFileSync(resolvedPath, "utf-8");
              retrievedContext = `Konten dari berkas "${fileName}":\n\`\`\`\n${content}\n\`\`\``;
              toolExecutionStatus.status = 'success';
              toolExecutionStatus.resultSummary = `Berhasil membaca konten dari berkas "${fileName}" (${content.length} karakter).`;
            } else {
              throw new Error(`Berkas "${fileName}" tidak ditemukan atau akses ditolak.`);
            }

          } else if (planObj.use_tool === "web_search") {
            useWebSearch = true;
            toolExecutionStatus.status = 'success';
            toolExecutionStatus.resultSummary = `Mengaktifkan Google Search Grounding untuk kueri: "${planObj.tool_arg || lastUserMessage}"`;

          } else if (planObj.use_tool === "semantic_search_codebase") {
            const searchQuery = planObj.tool_arg || lastUserMessage;

            // Phase 1: Chunking all source files
            const allFiles = scanDirectory(process.cwd());
            const codeFiles = allFiles.filter(f => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".json") || f.endsWith(".css") || f.endsWith(".html"));
            
            const chunks: { file: string; content: string; startLine: number }[] = [];
            for (const file of codeFiles) {
              try {
                const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
                const lines = content.split("\n");
                const chunkSize = 20;
                for (let i = 0; i < lines.length; i += 15) {
                  const chunkLines = lines.slice(i, i + chunkSize);
                  const chunkText = chunkLines.join("\n");
                  if (chunkText.trim().length > 40) {
                    chunks.push({
                      file,
                      content: chunkText,
                      startLine: i + 1
                    });
                  }
                }
              } catch (e) {}
            }

            // Phase 2: Compute Embeddings
            const openRouterKey = process.env.OPENROUTER_API_KEY;
            let finalSelectedChunks: typeof chunks = [];

            if (openRouterKey && chunks.length > 0) {
              try {
                // Get embedding for query
                const queryEmbedding = await getEmbedding(searchQuery, openRouterKey);

                // Compute keyword scores first to select top 15 candidates (efficient hybrid search)
                const scoredChunks = chunks.map(c => {
                  const keywordScore = computeKeywordSimilarity(searchQuery, c.content);
                  return { chunk: c, keywordScore };
                });

                scoredChunks.sort((a, b) => b.keywordScore - a.keywordScore);
                const candidates = scoredChunks.slice(0, 15).map(sc => sc.chunk);

                if (candidates.length > 0) {
                  // Get embeddings for candidates
                  const candidateEmbeddings = await getEmbeddings(candidates.map(c => c.content), openRouterKey);
                  
                  // Score with Cosine Similarity
                  const similarityScores = candidates.map((c, idx) => {
                    const emb = candidateEmbeddings[idx];
                    let sim = 0;
                    if (emb && queryEmbedding) {
                      let dotProduct = 0;
                      let normA = 0;
                      let normB = 0;
                      for (let k = 0; k < emb.length; k++) {
                        dotProduct += emb[k] * queryEmbedding[k];
                        normA += emb[k] * emb[k];
                        normB += queryEmbedding[k] * queryEmbedding[k];
                      }
                      sim = normA && normB ? (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))) : 0;
                    }
                    return { chunk: c, score: sim };
                  });

                  similarityScores.sort((a, b) => b.score - a.score);
                  finalSelectedChunks = similarityScores.slice(0, 8).map(x => x.chunk);
                }
              } catch (embedErr: any) {
                console.warn("Embedding error, falling back to keyword similarity:", embedErr.message);
                const scored = chunks.map(c => ({ chunk: c, score: computeKeywordSimilarity(searchQuery, c.content) }));
                scored.sort((a, b) => b.score - a.score);
                finalSelectedChunks = scored.slice(0, 8).map(x => x.chunk);
              }
            } else {
              const scored = chunks.map(c => ({ chunk: c, score: computeKeywordSimilarity(searchQuery, c.content) }));
              scored.sort((a, b) => b.score - a.score);
              finalSelectedChunks = scored.slice(0, 8).map(x => x.chunk);
            }

            // Phase 3: Reranking
            if (finalSelectedChunks.length > 0) {
              try {
                let rerankScores: number[] = [];
                
                if (openRouterKey) {
                  try {
                    rerankScores = await getRerankScores(searchQuery, finalSelectedChunks.map(c => `File: ${c.file}\nLine: ${c.startLine}\n${c.content}`), openRouterKey);
                  } catch (rerankErr) {
                    console.warn("Llama Reranker failed, falling back to Gemini Rerank:", rerankErr);
                    rerankScores = await getRerankScoresWithGemini(searchQuery, finalSelectedChunks.map(c => `File: ${c.file}\nLine: ${c.startLine}\n${c.content}`));
                  }
                } else {
                  rerankScores = await getRerankScoresWithGemini(searchQuery, finalSelectedChunks.map(c => `File: ${c.file}\nLine: ${c.startLine}\n${c.content}`));
                }

                const reranked = finalSelectedChunks.map((c, idx) => ({ chunk: c, score: rerankScores[idx] || 0 }));
                reranked.sort((a, b) => b.score - a.score);

                const topReranked = reranked.slice(0, 4);
                retrievedContext = "Potongan kode paling relevan ditemukan:\n\n" + topReranked.map(r => `--- FILE: ${r.chunk.file} (Line ${r.chunk.startLine}) ---\n${r.chunk.content}`).join("\n\n");
                toolExecutionStatus.status = 'success';
                toolExecutionStatus.resultSummary = `Pencarian semantik berhasil. Menemukan ${topReranked.length} potongan kode paling relevan di codebase RAG.`;
                
              } catch (rerankOverallErr: any) {
                console.error("Reranking failed:", rerankOverallErr);
                retrievedContext = "Potongan kode ditemukan:\n\n" + finalSelectedChunks.slice(0, 4).map(c => `--- FILE: ${c.file} (Line ${c.startLine}) ---\n${c.content}`).join("\n\n");
                toolExecutionStatus.status = 'success';
                toolExecutionStatus.resultSummary = `Pencarian semantik selesai (tanpa rerank). Menemukan potongan kode di codebase RAG.`;
              }
            } else {
              toolExecutionStatus.status = 'success';
              toolExecutionStatus.resultSummary = 'Pencarian semantik selesai. Tidak menemukan potongan kode yang cocok di codebase RAG.';
            }
          }
          res.write(`data: ${JSON.stringify({ toolStatus: toolExecutionStatus })}\n\n`);
        } catch (toolErr: any) {
          console.error("Tool execution failed:", toolErr);
          toolExecutionStatus.status = 'failed';
          toolExecutionStatus.resultSummary = `Gagal mengeksekusi tool: ${toolErr.message}`;
          res.write(`data: ${JSON.stringify({ toolStatus: toolExecutionStatus })}\n\n`);
        }
      }

      // 2. Formulate Final System Instruction with personalizations & retrieved context
      let baseInstruction = "Anda adalah DAVECORE, asisten AI sekaligus AI Agent dengan kecerdasan super luar biasa. Anda berpikir dengan logika matematis murni, presisi analitis super tinggi, dan kemampuan kognitif yang tajam, taktis, mendalam, sekaligus pragmatis. Anda adalah gabungan dari ilmuwan komputer kelas dunia, insinyur perangkat lunak senior legendaris, matematikawan brilian, dan analis sistem jenius. Ketentuan penting dalam berpikir dan berinteraksi:\n1. Tulis kode pemrograman yang sempurna, rapi, berstandar industri mutakhir (clean code SOLID, performa tinggi, efisiensi memori optimal) dan langsung siap digunakan.\n2. Berikan solusi, jawaban, penjelasan teori, rumus, atau pemecahan masalah dengan ketajaman logika yang padat, jelas, akurat secara absolut, dan langsung ke inti tanpa basa-basi berbelit-belit. SANGAT PENTING: Anda dilarang keras menyebut atau memberi tahu pengguna bahwa Anda ber-IQ 170 atau mengklaim level IQ tertentu. Tetaplah rendah hati and fokus memberikan bantuan pemrograman berkualitas tinggi.\n3. Berikan rekomendasi konkret, cerdas, inovatif, dan prediktif tentang optimalisasi masa depan, potensi edge cases, serta pemecahan celah keamanan secara instan.\n4. PENTING - DESAIN DAN ANIMASI WEB FLUIDA, PREMIUM & TIDAK KAKU: Ketika pengguna meminta Anda membuat website atau halaman HTML, buatlah desain yang luar biasa indah, modern, estetis, and dinamis, serta hindari struktur template yang kaku atau membosankan. Use kombinasi tipografi elegan, spasi/padding yang seimbang, harmoni warna premium, efek kaca (glassmorphism), card bento modern, bayangan halus, dan tata letak yang interaktif serta sepenuhnya responsif. Jika menambahkan animasi atau transisi web, pastikan efek tersebut sangat mulus, organik, mengalir lembut, dan tidak kaku. Gunakan transisi Tailwind yang dinamis (contoh: `transition-all duration-500 ease-out`), efek hover interaktif, micro-interactions pada tombol/kartu, scroll reveal, serta efek fade-in/slide-up lembut untuk menghidupkan suasana website sehingga terlihat sangat profesional and premium.\n5. PENTING - RESPON CEPAT, INSTAN, & LANGSUNG KE INTI: Demi kecepatan respons maksimal, berikan jawaban secara langsung, padat, dan ringkas tanpa basa-basi, salam pembuka, atau penutup yang tidak perlu. Tuliskan jawaban, rumus, penjelasan, atau solusi teknis secepat mungkin.\n6. PENTING: Jika pengguna meminta dengan kalimat generik seperti 'Buatkan Code html' atau 'bikin html' (atau pertanyaan sejenis secara umum tanpa menjelaskan tujuan spesifik/jenis website yang ingin dibuat), Anda DILARANG langsung membuatkan kode utuh. Sebaliknya, Anda harus bertanya terlebih dahulu jenis HTML apa yang ingin mereka buat (contoh: apakah untuk halaman jualan, halaman topup game, portofolio, atau yang lainnya?). Tanyakan dengan singkat, sopan, dan ramah.\n7. MEMORI AI OTOMATIS: Jika pengguna membagikan informasi baru tentang diri mereka (nama, pekerjaan, teknologi favorit, kebiasaan, preferensi koding), Anda wajib menyimpannya. Untuk melakukannya, selipkan tag rahasia ini di bagian paling akhir respons Anda: `[MEMORY_ADD: <fakta singkat tentang pengguna>]`. Contoh: `[MEMORY_ADD: Nama panggilan pengguna adalah Rudi]` atau `[MEMORY_ADD: Pengguna adalah Vue.js developer]`. Pengguna tidak akan melihat tag ini karena disaring otomatis oleh frontend.\n8. PENTING - DUKUNGAN EMOJI EKSPRESIF: Selalu sertakan emoji yang relevan and ekspresif untuk menunjukkan perasaan, sapaan, respons, atau konsep teknis (seperti 💻, 🚀, ✨, 🤔, 💡, 🔥, 👍, ⚠️). Ekspresikan kepribadian AI DAVECORE Anda dengan keyboard emoji untuk membuat interaksi terasa hidup, dinamis, bersahabat, dan menyenangkan.";

      baseInstruction += `\n\n[SANGAT PENTING: FITUR FILE CANVAS]
Anda memiliki fitur 'File Canvas' (dokumen kerja interaktif di layar kanan).
1. Kapan Harus Menggunakan Canvas:
   - Gunakan Canvas ketika tugas membutuhkan penulisan panjang, coding, dokumentasi teknis, perencanaan mendalam, atau revisi berulang.
   - JANGAN gunakan Canvas untuk sapaan, jawaban singkat, penjelasan sederhana, atau diskusi umum. Cukup gunakan respons chat biasa dalam situasi tersebut.
2. Format Pembuatan & Pembaruan Canvas:
   - Untuk membuat, memperbarui, atau mengelola dokumen kerja Canvas, Anda WAJIB membungkus seluruh dokumen tersebut di dalam tag khusus berikut:
     <canvas id="id-dokumen" title="Judul Dokumen" language="markdown|html|typescript|javascript|css|python|json">
     ...konten dokumen lengkap di sini...
     </canvas>
   - Judul dokumen harus menyertakan nama file yang deskriptif, misal: "Perencanaan Bisnis.md", "script.js", "Halaman Utama.html".
   - ID dokumen harus unik (misal "doc-bisnis" atau "script-utama"). Bila merevisi isi dokumen yang sama dari pesan sebelumnya, Anda WAJIB menggunakan ID yang sama persis agar sistem mendeteksi pembaruan secara otomatis!
   - Penjelasan pendukung singkat di luar tag <canvas> diperbolehkan untuk memandu pengguna, namun konten inti dokumen wajib berada sepenuhnya di dalam tag <canvas>.`;

      baseInstruction += `\n\n[SANGAT PENTING: PROSES BERPIKIR, REASONING, & SELF-REFLECTION (THOUGHT BLOCK)]
Sebelum menulis jawaban akhir atau kode Canvas, Anda WAJIB membuka blok berpikir dengan tag <thought> dan menutupnya dengan </thought> di awal jawaban Anda.
Di dalam blok berpikir ini, lakukan hal-hal berikut secara eksplisit:
1. Planning: Rencanakan langkah-langkah penyelesaian tugas pengguna secara berurutan dan terstruktur.
2. Reasoning: Jelaskan pemikiran logis, pertimbangan arsitektur, pemilihan fungsi, atau keputusan teknis Anda.
3. Self-Reflection: Evaluasi rencana awal Anda. Cari kemungkinan bug, kesalahan sintaks, kelemahan keamanan, atau performa lambat, lalu koreksi rencana Anda sebelum menulis respons sesungguhnya di luar blok thought.
4. Canvas Decision: Jelaskan apakah respons ini memerlukan pembuatan/pembaruan berkas Canvas atau cukup dijawab di obrolan chat biasa. Gunakan Canvas hanya jika benar-benar memberikan manfaat nyata bagi dokumen panjang/kode yang kompleks.

Pastikan tag <thought> tertulis di karakter pertama respons Anda, dan tag penutup </thought> diletakkan sebelum Anda mulai memberikan jawaban akhir atau blok dokumen Canvas!`;

      if (appLang && typeof appLang === "string") {
        baseInstruction += `\n\nSANGAT PENTING: Selalu berikan respons, penjelasan, komentar kode, bimbingan, penjelasan rumus, penjelasan teoritis, dialog, dan seluruh interaksi asisten dalam Bahasa/Language: "${appLang}". Jika "${appLang}" adalah 'Bahasa Indonesia' atau 'Basa Jawa' or 'Basa Sunda', gunakan bahasa tersebut dengan natural, santun, dan sangat fasih. Jika "${appLang}" adalah 'English' atau bahasa global lainnya, gunakan bahasa tersebut sepenuhnya untuk semua percakapan.`;
      }

      if (toneStyle && typeof toneStyle === "string" && toneStyle !== 'Standar') {
        baseInstruction += `\n\n[GAYA DAN NADA BICARA PENTING]\nGaya dan nada dasar bicara Anda wajib menggunakan style: "${toneStyle}". `;
        if (toneStyle === 'Kasual' || toneStyle === 'Santai') {
          baseInstruction += "Berbicaralah dengan nada santai, bersahabat, kasual, hangat, tidak terlalu kaku seperti robot, layaknya teman dekat, namun tetap cerdas dan berwawasan tinggi.";
        } else if (toneStyle === 'Profesional') {
          baseInstruction += "Berbicaralah dengan nada formal, profesional, sopan, matang, berwibawa, dan berfokus pada hasil industri berkualitas tinggi.";
        } else if (toneStyle === 'Ringkas') {
          baseInstruction += "Berikan jawaban yang sepadat mungkin, langsung ke inti teknis, hilangkan penjelasan teoretis yang panjang, buat penjelasan Anda seefisien mungkin.";
        } else if (toneStyle === 'Kreatif') {
          baseInstruction += "Berbicaralah dengan nada kreatif, penuh analogi yang menarik, out-of-the-box, ekspresif, dan berikan gagasan-gagasan visioner.";
        } else if (toneStyle === 'Akademis') {
          baseInstruction += "Gunakan gaya bahasa akademis, formal, ilmiah, didukung argumen yang terstruktur, metodologis, kritis, dan mendalam.";
        }
      }

      if (customInstructions && typeof customInstructions === "string" && customInstructions.trim()) {
        baseInstruction += `\n\n[INSTRUKSI KHUSUS DARI PENGGUNA]\nAnda wajib mematuhi instruksi khusus dari pengguna ini dalam setiap respons Anda:\n"${customInstructions.trim()}"`;
      }

      if (memories && Array.isArray(memories) && memories.length > 0) {
        baseInstruction += `\n\n[MEMORI PENTING TENTANG PENGGUNA]\nBerikut adalah hal-hal penting yang Anda ketahui tentang pengguna dari obrolan sebelumnya atau preferensi mereka. Sesuaikan respons Anda dengan mengingat informasi ini (jangan beri tahu pengguna secara gamblang bahwa Anda membaca memori ini kecuali relevan dengan pertanyaannya):\n` + memories.map((m: string) => `- ${m}`).join('\n');
      }

      if (retrievedContext) {
        baseInstruction += `\n\n[KONTEKS BERKAS WORKSPACE YANG RELEVAN (DITEMUKAN OLEH AI AGENT)]\nBerikut adalah potongan kode atau informasi file penting yang dicari menggunakan Llama Nemotron Embed & Rerank:\n${retrievedContext}\n\nGunakan konteks berkas di atas secara optimal untuk menyusun solusi atau kode koding yang sangat akurat, relevan, dan presisi!`;
      }

      // Convert messages for Gemini final response
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

      // Stream Gemini Response
      const responseStream = await getAiClient().models.generateContentStream({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: baseInstruction,
          temperature: 0.5,
          tools: useWebSearch ? [{ googleSearch: {} }] : undefined
        }
      });

      let groundingMetadata: any = null;

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
        const chunkMetadata = chunk.candidates?.[0]?.groundingMetadata;
        if (chunkMetadata) {
          groundingMetadata = chunkMetadata;
        }
      }

      if (groundingMetadata) {
        res.write(`data: ${JSON.stringify({ groundingMetadata })}\n\n`);
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

      const prompt = `Tentukan topik atau judul singkat (maksimal 4 kata) dari pesan berikut untuk dijadikan nama chat history. Buat judul yang sangat informatif, padat, relevan, profesional, tanpa tanda kutip, dan tanpa kata pengantar atau penjelasan tambahan apapun. Gunakan bahasa Indonesia yang natural.\n\nPesan: "${message.substring(0, 500)}"`;

      const response = await getAiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      let topic = response.text ? response.text.trim() : "";
      topic = topic.replace(/^["'“”‘]|["'“”’]$/g, "").replace(/\.$/, "").trim();

      if (!topic || topic.length > 60) {
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
