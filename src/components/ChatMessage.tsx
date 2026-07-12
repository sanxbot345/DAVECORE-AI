import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Copy, Check, Play, File, ChevronDown, ChevronUp, Download, FileText, ChevronRight,
  Settings, CheckCircle2, XCircle, Search, FileCode, FolderClosed, Globe 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Message, CanvasDocument } from '../types';

interface FileAttachment {
  name: string;
  content: string;
}

function parseFileAttachment(content: string): { attachment: FileAttachment | null; remainingText: string } {
  const match = content.match(/\[File Lampiran:\s*([^\]]+)\]\s*\n```[a-zA-Z-]*\n([\s\S]*?)\n```\s*\n?/);
  if (match) {
    const name = match[1];
    const fileContent = match[2];
    const remainingText = content.replace(match[0], '');
    return {
      attachment: { name, content: fileContent },
      remainingText
    };
  }
  return { attachment: null, remainingText: content };
}

function FileContainer({ attachment }: { attachment: FileAttachment }) {
  const charCount = attachment.content.length;
  const isBase64 = attachment.content.startsWith('data:') && attachment.content.includes(';base64,');
  const displaySize = charCount > 1024 
    ? `${(charCount / 1024).toFixed(1)} KB` 
    : `${charCount} B`;

  return (
    <div className="inline-flex items-center gap-1.5 bg-[#FAF9F6] border border-gray-150/40 rounded-md px-2 py-1 text-left my-1 max-w-full select-none" title={attachment.name}>
      <File className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      <span className="text-[10px] font-medium text-gray-500 leading-none">
        {isBase64 ? 'Media' : 'Dokumen'} • {displaySize}
      </span>
    </div>
  );
}

const getExtension = (lang: string): string => {
  const l = (lang || '').toLowerCase();
  switch (l) {
    case 'typescript': case 'ts': return 'ts';
    case 'tsx': return 'tsx';
    case 'javascript': case 'js': return 'js';
    case 'jsx': return 'jsx';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'python': case 'py': return 'py';
    case 'markdown': case 'md': return 'md';
    case 'rust': case 'rs': return 'rs';
    case 'golang': case 'go': return 'go';
    case 'shell': case 'bash': case 'sh': return 'sh';
    case 'yaml': case 'yml': return 'yml';
    default: return 'txt';
  }
};

const detectFilename = (code: string, lang: string): string => {
  const lines = code.split('\n');
  if (lines.length > 0) {
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      const commentPattern = /^(?:\/\/|#|<!--|\/\*)\s*([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)\s*(?:-->|\*\/)?$/;
      const match = line.match(commentPattern);
      if (match && match[1]) {
        return match[1].trim();
      }
      const pathCommentPattern = /(?:\/\/|#|<!--|\/\*)\s*(?:[a-zA-Z0-9_\-\/]+\/)?([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)/;
      const matchPath = line.match(pathCommentPattern);
      if (matchPath && matchPath[1] && matchPath[1].includes('.')) {
        return matchPath[1].trim();
      }
    }
  }
  const ext = getExtension(lang);
  return `davecore_code.${ext}`;
};

const handleDownload = (code: string, lang: string) => {
  const filename = detectFilename(code, lang);
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Thought tag parser helper
function parseThoughtBlock(content: string): { thought: string; cleanContent: string } {
  const startTag = '<thought>';
  const endTag = '</thought>';
  
  const startIdx = content.indexOf(startTag);
  if (startIdx !== -1) {
    const endIdx = content.indexOf(endTag);
    if (endIdx !== -1) {
      const thought = content.slice(startIdx + startTag.length, endIdx).trim();
      const cleanContent = (content.slice(0, startIdx) + content.slice(endIdx + endTag.length)).trim();
      return { thought, cleanContent };
    } else {
      const thought = content.slice(startIdx + startTag.length).trim();
      return { thought, cleanContent: '' };
    }
  }
  
  return { thought: '', cleanContent: content };
}

// Sub-widgets for Davecore Agent
function PlanningWidget({ planning }: { planning: any }) {
  const [isOpen, setIsOpen] = useState(true);
  if (!planning) return null;

  const { thought_process, steps } = planning;

  return (
    <div className="mb-4 rounded-xl border border-gray-150 bg-gray-50/40 overflow-hidden shadow-xs font-sans text-xs">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left font-medium text-gray-700 bg-gray-100/40 hover:bg-gray-100/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-gray-200/50 text-gray-600 text-[11px] font-bold">🎯</span>
          <span className="font-bold text-[13px] tracking-tight text-gray-800">Rencana Agen (Core Orchestrator)</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <span className="text-[11px] font-semibold text-gray-500">{isOpen ? 'Tutup' : 'Lihat'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-100 space-y-3 bg-white text-[13px] leading-relaxed text-gray-650">
          {thought_process && (
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Strategi Tindakan</span>
              <p className="text-gray-700 font-medium">{thought_process}</p>
            </div>
          )}

          {steps && steps.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Langkah Eksekusi</span>
              <ul className="space-y-1">
                {steps.map((step: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-gray-650">
                    <span className="inline-flex shrink-0 items-center justify-center h-4 w-4 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold mt-0.5">{i+1}</span>
                    <span className="font-medium">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolsUsedWidget({ tools }: { tools: any[] }) {
  if (!tools || tools.length === 0) return null;

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'list_workspace_files': return <FolderClosed className="w-4 h-4 text-amber-500" />;
      case 'read_file': return <FileCode className="w-4 h-4 text-blue-500" />;
      case 'semantic_search_codebase': return <Search className="w-4 h-4 text-purple-500" />;
      case 'web_search': return <Globe className="w-4 h-4 text-teal-500" />;
      default: return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getToolLabel = (name: string) => {
    switch (name) {
      case 'list_workspace_files': return 'Mendaftar Berkas Proyek';
      case 'read_file': return 'Membaca Isi Berkas';
      case 'semantic_search_codebase': return 'Pencarian Semantik Codebase';
      case 'web_search': return 'Pencarian Web Google Search';
      default: return name;
    }
  };

  return (
    <div className="space-y-2 mb-4 font-sans text-xs">
      {tools.map((tool, idx) => (
        <div 
          key={idx} 
          className="flex items-center justify-between p-3 rounded-xl border border-gray-150/50 bg-[#FAF9F6]/80 text-gray-700"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-white border border-gray-100 shrink-0">
              {getToolIcon(tool.name)}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[13px] text-gray-800">{getToolLabel(tool.name)}</div>
              {tool.arg && (
                <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-[280px] sm:max-w-md" title={tool.arg}>
                  kueri: {tool.arg}
                </div>
              )}
              {tool.resultSummary && (
                <div className="text-[12px] text-gray-600 font-medium mt-1">
                  💡 {tool.resultSummary}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border border-gray-100 text-[11px] font-bold">
            {tool.status === 'executing' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-blue-600">Proses...</span>
              </>
            )}
            {tool.status === 'success' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-600">Selesai</span>
              </>
            )}
            {tool.status === 'failed' && (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-rose-600">Gagal</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThoughtWidget({ thought }: { thought: string }) {
  const [isOpen, setIsOpen] = useState(true);
  if (!thought) return null;

  return (
    <div className="mb-4 rounded-xl border border-indigo-100/80 bg-indigo-50/10 overflow-hidden font-sans text-xs">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left font-medium text-indigo-700 bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-100/50 text-indigo-700 text-[11px] font-bold">🧠</span>
          <span className="font-bold text-[13px] tracking-tight text-indigo-900">Proses Berpikir & Self-Reflection</span>
        </div>
        <div className="flex items-center gap-1 text-indigo-400">
          <span className="text-[11px] font-semibold text-indigo-600">{isOpen ? 'Tutup' : 'Lihat'}</span>
          {isOpen ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} className="text-indigo-600" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-indigo-100/40 bg-white/50 text-[13px] leading-relaxed text-indigo-950 font-medium whitespace-pre-wrap">
          {thought}
        </div>
      )}
    </div>
  );
}

function GroundingSourcesWidget({ metadata }: { metadata: any }) {
  if (!metadata || !metadata.groundingChunks || metadata.groundingChunks.length === 0) return null;

  const sources: { title: string; url: string; domain: string }[] = [];
  const addedUrls = new Set<string>();

  metadata.groundingChunks.forEach((chunk: any) => {
    const web = chunk.web;
    if (web && web.uri) {
      const url = web.uri;
      if (!addedUrls.has(url)) {
        addedUrls.add(url);
        let domain = '';
        try {
          domain = new URL(url).hostname.replace('www.', '');
        } catch (e) {
          domain = url;
        }
        sources.push({
          title: web.title || domain,
          url,
          domain
        });
      }
    }
  });

  if (sources.length === 0) return null;

  return (
    <div className="mt-6 border-t border-gray-100 pt-4 font-sans text-xs">
      <div className="flex items-center gap-1.5 text-gray-500 font-bold uppercase tracking-wider mb-2.5">
        <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>Referensi Sumber Web ({sources.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sources.map((source, i) => (
          <motion.a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            whileHover={{ y: -1 }}
            className="flex flex-col gap-0.5 p-2.5 rounded-xl border border-gray-150 bg-gray-50/20 hover:bg-white hover:border-teal-200 hover:shadow-xs transition-all text-left group cursor-pointer"
          >
            <span className="font-bold text-[12px] text-gray-800 line-clamp-1 group-hover:text-teal-600 transition-colors">
              {source.title}
            </span>
            <span className="text-[10px] text-gray-500 font-medium font-mono truncate">
              {source.domain}
            </span>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
  onPreviewCode?: (code: string) => void;
  onOpenCanvas?: (id: string, title: string, language: string, content: string) => void;
}

export const ChatMessage = React.memo(function ChatMessage({ message, onPreviewCode, onOpenCanvas }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldHighlight(true);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const { attachment, remainingText } = parseFileAttachment(message.content);

  const [displayedText, setDisplayedText] = useState('');
  const lastTextRef = useRef('');

  useEffect(() => {
    setDisplayedText(remainingText);
    lastTextRef.current = remainingText;
  }, [remainingText]);

  if (isUser) {
    return (
      <motion.div 
        className="flex justify-end w-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="max-w-[85%] bg-claude-user-bg p-4 rounded-2xl rounded-tr-none text-[15px] leading-relaxed text-claude-text flex flex-col gap-3">
          {attachment && (
            <FileContainer attachment={attachment} />
          )}
          {remainingText.trim() ? (
            <p className="whitespace-pre-wrap">{remainingText}</p>
          ) : (
            attachment && <p className="text-xs text-gray-400 italic">Menganalisis file...</p>
          )}
        </div>
      </motion.div>
    );
  }

  if (message.isStreaming && !message.content && !(message as any).planning && (!message.toolsUsed || message.toolsUsed.length === 0)) {
    return null;
  }

  const { thought, cleanContent } = parseThoughtBlock(displayedText);

  return (
    <motion.div 
      className="flex gap-4 w-full text-left"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex-1 space-y-4 w-full max-w-full">
        {/* Agent workflow headers */}
        <PlanningWidget planning={(message as any).planning} />
        <ToolsUsedWidget tools={message.toolsUsed || []} />
        <ThoughtWidget thought={thought} />

        {cleanContent.trim() ? (
          <div className={`text-[15px] leading-relaxed text-claude-text font-serif markdown-body ${message.isStreaming ? 'is-streaming-text streaming-cursor' : ''}`}>
            {attachment && (
              <div className="mb-4">
                <FileContainer attachment={attachment} />
              </div>
            )}
            {(() => {
              const parts = cleanContent.split(/(:::canvas-card[\s\S]*?:::)/g);
              return parts.map((part, index) => {
                const canvasMatch = part.match(/:::canvas-card\s*ID:\s*([^\n]+)\s*Title:\s*([^\n]+)\s*Language:\s*([^\n]+)\s*:::/i);
                if (canvasMatch) {
                  const id = canvasMatch[1].trim();
                  const title = canvasMatch[2].trim();
                  const language = canvasMatch[3].trim();
                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => onOpenCanvas?.(id, title, language, '')}
                      className="w-full my-4 p-4 rounded-xl border border-gray-250 bg-gradient-to-r from-gray-50 to-white hover:from-white hover:to-gray-50 shadow-xs transition-all flex items-center justify-between text-left cursor-pointer group font-sans"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                          <FileText size={20} className="group-hover:animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-bold text-gray-900 truncate leading-snug">{title}</h4>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono bg-gray-100 px-1 py-0.2 rounded text-[10px] text-gray-650 uppercase font-semibold">{language}</span>
                            • Dokumen Kerja Canvas • Klik untuk Membuka
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-indigo-600 text-xs font-semibold shrink-0">
                        <span>Buka</span>
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </motion.button>
                  );
                }

                if (!part.trim()) return null;

                return (
                  <Markdown 
                    key={index}
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: ({ node, ...props }) => (
                        <div className="mb-6 overflow-hidden rounded-xl bg-white border border-gray-100 font-sans shadow-sm">
                          {props.children}
                        </div>
                      ),
                      code(props) {
                        const {children, className, node, ref, ...rest} = props
                        const match = /language-(\w+)/.exec(className || '')
                        const codeString = String(children).replace(/\n$/, '');
                        
                        const isInline = !match && !codeString.includes('\n');
                        
                        if (isInline) {
                          return (
                            <code {...rest} className="text-claude-accent bg-claude-accent/5 px-1 py-0.5 rounded text-[13.5px] font-mono font-semibold">
                              {children}
                            </code>
                          )
                        }

                        const language = match ? match[1] : '';
                        const isHtmlOnly = language === 'html' || 
                                           language === 'xml' || 
                                           language === 'svg' || 
                                           (language === '' && codeString.trim().startsWith('<') && codeString.trim().includes('>'));

                        return (
                          <div className="flex flex-col w-full bg-white font-sans">
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 text-gray-500 text-xs border-b border-gray-100">
                              <span className="font-semibold lowercase">{match ? language : 'code'}</span>
                              <div className="flex items-center gap-1.5">
                                {isHtmlOnly && onPreviewCode && !message.isStreaming && (
                                  <button 
                                    onClick={() => onPreviewCode(codeString)} 
                                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-200/70 transition-colors text-gray-700 font-medium cursor-pointer"
                                    title="Preview Code"
                                  >
                                    <Play className="w-3.5 h-3.5 text-blue-600" fill="currentColor" />
                                    <span>Preview</span>
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleCopy(codeString)} 
                                  className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-200/70 transition-colors text-gray-700 font-medium cursor-pointer"
                                  title="Copy Code"
                                >
                                  {copiedCode === codeString ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                                  <span>{copiedCode === codeString ? 'Copied' : 'Copy'}</span>
                                </button>
                                <button 
                                  onClick={() => handleDownload(codeString, language)} 
                                  className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-200/70 transition-colors text-gray-700 font-medium cursor-pointer"
                                  title="Download Code"
                                >
                                  <Download className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                            
                            {message.isStreaming || !shouldHighlight ? (
                              <div className="p-4 overflow-x-auto bg-white">
                                <pre className="m-0 !bg-transparent !border-0">
                                  <code {...rest} className={`text-gray-800 text-[13.5px] font-mono whitespace-pre !bg-transparent !p-0 ${className || ''}`}>
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            ) : (
                              <div className="bg-white overflow-x-auto">
                                {match ? (
                                  <SyntaxHighlighter
                                    {...rest}
                                    PreTag="div"
                                    children={codeString}
                                    language={language}
                                    style={oneLight}
                                    customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                                    className="!m-0 text-[13.5px]"
                                  />
                                ) : (
                                  <pre className="p-4 m-0 !bg-transparent !border-0">
                                    <code {...rest} className="text-gray-800 text-[13.5px] font-mono whitespace-pre !bg-transparent !p-0">
                                      {children}
                                    </code>
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      }
                    }}
                  >
                    {part}
                  </Markdown>
                );
              });
            })()}
          </div>
        ) : (
          message.isStreaming && (
            <div className="flex items-center gap-2.5 text-xs text-indigo-600 italic font-sans font-semibold mt-1">
              <span>Agent sedang menyusun jawaban</span>
              <div className="flex items-center gap-1 bg-transparent px-1 py-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
                    animate={{
                      y: ["0px", "-4px", "0px"]
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.15
                    }}
                  />
                ))}
              </div>
            </div>
          )
        )}

        {/* Web Search Sources citations */}
        <GroundingSourcesWidget metadata={message.groundingMetadata} />
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content &&
         prevProps.message.isStreaming === nextProps.message.isStreaming &&
         JSON.stringify(prevProps.message.toolsUsed) === JSON.stringify(nextProps.message.toolsUsed) &&
         JSON.stringify((prevProps.message as any).planning) === JSON.stringify((nextProps.message as any).planning) &&
         JSON.stringify(prevProps.message.groundingMetadata) === JSON.stringify(nextProps.message.groundingMetadata) &&
         prevProps.onPreviewCode === nextProps.onPreviewCode &&
         prevProps.onOpenCanvas === nextProps.onOpenCanvas;
});
