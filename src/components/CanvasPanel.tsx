import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Maximize2, Minimize2, Copy, Check, Download, Edit3, Eye, 
  Send, Sparkles, AlertCircle, Play, FileText, CheckCheck, Loader2
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CanvasDocument } from '../types';

interface CanvasPanelProps {
  doc: CanvasDocument;
  onClose: () => void;
  onSave: (updatedContent: string) => void;
  onRevision: (prompt: string) => void;
  isGenerating?: boolean;
}

export function CanvasPanel({ doc, onClose, onSave, onRevision, isGenerating = false }: CanvasPanelProps) {
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'preview-html'>('view');
  const [content, setContent] = useState(doc.content);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [htmlPreviewUrl, setHtmlPreviewUrl] = useState<string | null>(null);

  // Sync state if doc content changes from outside (AI updates it)
  useEffect(() => {
    setContent(doc.content);
    setHasUnsavedChanges(false);
  }, [doc.content]);

  // If HTML document, generate blob URL for active iframe preview
  useEffect(() => {
    if (activeTab === 'preview-html' && (doc.language === 'html' || doc.language === 'xml')) {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setHtmlPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setHtmlPreviewUrl(null);
    }
  }, [activeTab, content, doc.language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      markdown: 'md', md: 'md',
      typescript: 'ts', ts: 'ts',
      tsx: 'tsx',
      javascript: 'js', js: 'js',
      html: 'html', css: 'css',
      json: 'json', python: 'py', py: 'py'
    };
    const ext = extMap[doc.language.toLowerCase()] || 'txt';
    const filename = doc.title.includes('.') ? doc.title : `${doc.title}.${ext}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleSaveClick = () => {
    onSave(content);
    setHasUnsavedChanges(false);
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionPrompt.trim()) return;
    onRevision(revisionPrompt.trim());
    setRevisionPrompt('');
  };

  const isHtml = doc.language === 'html' || doc.language === 'xml' || doc.language === 'svg';

  return (
    <motion.div 
      layoutId={isFullscreen ? "canvas-fullscreen" : "canvas-sidebar"}
      className={`bg-white border-l border-gray-200 shadow-xl flex flex-col h-full overflow-hidden transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-50 w-full' 
          : 'relative w-full lg:w-[600px] xl:w-[700px] shrink-0'
      }`}
    >
      {/* Header Panel */}
      <div className="px-5 py-4 border-b border-gray-150 bg-gray-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shrink-0">
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-gray-900 truncate flex items-center gap-2">
              {doc.title}
              {hasUnsavedChanges && (
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Perubahan belum disimpan" />
              )}
            </h3>
            <p className="text-[10px] text-gray-400 font-medium font-mono uppercase tracking-wider">
              {doc.language} Document • ID: {doc.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Action buttons */}
          <button 
            onClick={handleCopy}
            className="p-2 hover:bg-gray-150 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
            title="Salin isi dokumen"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button 
            onClick={handleDownload}
            className="p-2 hover:bg-gray-150 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
            title="Unduh file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-150 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
            title={isFullscreen ? "Perkecil layar" : "Perbesar layar penuh"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-500 transition-colors"
            title="Tutup Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="px-5 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'view'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Tampilan Kerja
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Manual
          </button>
          {isHtml && (
            <button
              onClick={() => setActiveTab('preview-html')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'preview-html'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-emerald-650" />
              Live HTML Preview
            </button>
          )}
        </div>

        {/* Unsaved changes alert */}
        <AnimatePresence>
          {hasUnsavedChanges && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={handleSaveClick}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Simpan Editan
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Editor/View/Preview Area */}
      <div className="flex-1 overflow-y-auto bg-white relative">
        {isGenerating && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-indigo-50/70 backdrop-blur-xs border-b border-indigo-100 px-4 py-2 text-[11px] font-medium text-indigo-800 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-indigo-650" />
            <span>AI sedang menulis/memperbarui dokumen kerja ini secara real-time...</span>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="p-6 md:p-8">
            {doc.language.toLowerCase() === 'markdown' || doc.language.toLowerCase() === 'md' ? (
              <div className="markdown-body font-serif text-[15px] leading-relaxed max-w-none">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {content}
                </Markdown>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-150 overflow-hidden text-xs bg-gray-50">
                <SyntaxHighlighter
                  language={doc.language.toLowerCase()}
                  style={oneLight}
                  PreTag="div"
                  customStyle={{ margin: 0, padding: '1.25rem', background: 'transparent' }}
                  className="font-mono text-[13px] leading-relaxed"
                >
                  {content}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="w-full h-full p-4 flex flex-col">
            <textarea
              value={content}
              onChange={handleContentChange}
              className="flex-1 w-full h-full min-h-[400px] bg-gray-50/50 p-4 border border-gray-200 rounded-xl font-mono text-[13px] leading-relaxed text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-none shadow-inner"
              placeholder="Tulis atau edit dokumen kerja Anda di sini..."
            />
          </div>
        )}

        {activeTab === 'preview-html' && htmlPreviewUrl && (
          <div className="w-full h-full bg-white relative">
            <iframe
              src={htmlPreviewUrl}
              className="w-full h-full border-none bg-white"
              title="Canvas Live Preview"
            />
          </div>
        )}
      </div>

      {/* Revision Input Bar (The bridge connecting Chat to Canvas) */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0">
        <form onSubmit={handleRevisionSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
              <Sparkles size={16} />
            </span>
            <input
              type="text"
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              disabled={isGenerating}
              className="w-full pl-10 pr-4 h-12 bg-white border border-gray-250 rounded-xl text-xs font-semibold placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 shadow-sm disabled:opacity-50"
              placeholder={`Minta DAVECORE merevisi isi Canvas ini... (misal: "tambahkan bab kesimpulan")`}
            />
          </div>
          <button
            type="submit"
            disabled={!revisionPrompt.trim() || isGenerating}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-2.5 leading-none">
          Mengetik di sini akan memberi AI konteks isi dokumen terkini secara otomatis untuk diedit secara cerdas.
        </p>
      </div>
    </motion.div>
  );
}
