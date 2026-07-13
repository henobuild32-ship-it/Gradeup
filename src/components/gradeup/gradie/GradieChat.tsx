import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageSquare, Plus, Send, Paperclip, Trash2, X, ChevronLeft, Search, Star, Pin, Copy, Volume2, Mic, Download, RotateCcw, ChevronDown, AlertTriangle, CheckCircle2, FileText, Image as ImageIcon } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface AiDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  summary: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: AiMessage[];
  documents: AiDocument[];
}

interface ConversationSummary {
  id: string;
  title: string;
  tags: string;
  favorite: boolean;
  pinned: boolean;
  updatedAt: string;
  messages: { content: string; role: string; createdAt: string }[];
}

interface GradieChatProps {
  userId: string;
  schoolId: string;
  userRole?: string;
  userName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_TYPES = [
  { mime: 'application/pdf', ext: '.pdf', label: 'PDF', icon: 'pdf' },
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx', label: 'Word', icon: 'doc' },
  { mime: 'text/plain', ext: '.txt', label: 'Texte', icon: 'txt' },
  { mime: 'image/jpeg', ext: '.jpg', label: 'JPEG', icon: 'img' },
  { mime: 'image/png', ext: '.png', label: 'PNG', icon: 'img' },
  { mime: 'image/webp', ext: '.webp', label: 'WebP', icon: 'img' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function renderMessage(content: string) {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
}

// ─── Virtualized Message Item ─────────────────────────────────────────────────

interface MessageItemProps {
  msg: AiMessage;
  idx: number;
  total: number;
  activeConversation: Conversation | null;
  isStreaming: boolean;
  streamingContent: string;
  isAtBottom: boolean;
  scrollToBottom: (smooth: boolean) => void;
  formatDate: (iso: string) => string;
  renderMessage: (content: string) => string;
  speakMessage: (text: string) => void;
  onRegenerate: () => void;
}

function MessageItem({ msg, idx, total, activeConversation, isStreaming, streamingContent, isAtBottom, scrollToBottom, formatDate, renderMessage, speakMessage, onRegenerate }: MessageItemProps) {
  const isUser = msg.role === 'user';
  const isLast = idx === total - 1;
  const showTimestamp = isLast || (activeConversation && idx + 1 < total && new Date(activeConversation.messages[idx + 1].createdAt).getTime() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000);

  if (isStreaming && isLast && msg.role === 'assistant' && streamingContent) {
    return (
      <div key={msg.id} className="flex flex-col items-start animate-fade-in" style={{ height: 80 }}>
        <div className="flex items-end gap-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 self-end shadow-md shadow-blue-500/20">
            <span className="text-white text-[10px] font-bold">G</span>
          </div>
          <div className="message-bubble bg-[#E9E9EB] dark:bg-white/10 imessage-ai-bubble px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm" style={{ maxWidth: '75%' }}>
            <p className="text-[10px] font-semibold text-[#007AFF] dark:text-blue-400 mb-0.5">Gradie</p>
            <div className="message-bubble-text break-words leading-relaxed text-black dark:text-white/90" dangerouslySetInnerHTML={{ __html: renderMessage(streamingContent) }} />
            <span className="inline-block w-[2px] h-[16px] bg-[#007AFF] animate-pulse ml-0.5 align-middle rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}>
      <div className={`flex items-end gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-full`}>
        {!isUser && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 self-end shadow-md shadow-blue-500/20">
            <span className="text-white text-[10px] font-bold">G</span>
          </div>
        )}

        <div
          className={`message-bubble px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm group ${isUser ? 'bg-[#007AFF] text-white imessage-user-bubble' : 'bg-[#E9E9EB] dark:bg-white/10 text-black dark:text-white/90 imessage-ai-bubble'}`}
          style={{ maxWidth: '75%' }}
        >
          {!isUser && (
            <p className="text-[10px] font-semibold text-[#007AFF] dark:text-blue-400 mb-0.5">Gradie</p>
          )}
          <div className="message-bubble-text break-words leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }} />
          {!isUser && (
            <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => navigator.clipboard?.writeText(msg.content)} className="text-[#007AFF] dark:text-blue-400 hover:opacity-70 p-0.5" title="Copier"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => speakMessage(msg.content)} className="text-[#007AFF] dark:text-blue-400 hover:opacity-70 p-0.5" title="Lire à voix haute"><Volume2 className="w-3.5 h-3.5" /></button>
              {isLast && (
                <button onClick={onRegenerate} className="text-[#007AFF] dark:text-blue-400 hover:opacity-70 p-0.5" title="Régénérer"><RotateCcw className="w-3.5 h-3.5" /></button>
              )}
            </div>
          )}
        </div>
      </div>

      {showTimestamp && (
        <p className={`text-[10px] text-white/25 mt-1 ${isUser ? 'mr-2' : 'ml-9'}`}>{formatDate(msg.createdAt)}</p>
      )}
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start animate-fade-in">
      <div className="flex items-end gap-1.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 self-end shadow-md shadow-blue-500/20">
          <span className="text-white text-[10px] font-bold">G</span>
        </div>
        <div className="bg-[#E9E9EB] dark:bg-white/15 rounded-[18px] rounded-bl-[4px] px-4 py-3 shadow-sm">
          <div className="flex gap-[5px] items-center h-4">
            <span className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-white/40" style={{ animation: 'iosTypingDot 1.2s ease-in-out infinite', animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-white/40" style={{ animation: 'iosTypingDot 1.2s ease-in-out infinite', animationDelay: '200ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-white/40" style={{ animation: 'iosTypingDot 1.2s ease-in-out infinite', animationDelay: '400ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Action Sheet ────────────────────────────────────────────────────

interface UploadActionSheetProps {
  onClose: () => void;
  onSelectFile: (file: File) => void;
}

function UploadActionSheet({ onClose, onSelectFile }: UploadActionSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Fichier trop volumineux. Limite : ${MAX_FILE_SIZE_MB} Mo (votre fichier : ${formatSize(file.size)})`);
      return;
    }
    onSelectFile(file);
    onClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 animate-ios-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-ios-sheet-up">
        <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[16px] overflow-hidden shadow-2xl max-w-lg mx-auto">
          <div className="px-4 pt-4 pb-3 border-b border-black/10 dark:border-white/10">
            <div className="w-9 h-1 rounded-full bg-black/20 dark:bg-white/20 mx-auto mb-3" />
            <h3 className="text-[15px] font-semibold text-center text-black dark:text-white">Joindre un fichier</h3>
            <p className="text-[12px] text-[#8E8E93] text-center mt-0.5">Limite : {MAX_FILE_SIZE_MB} Mo par fichier</p>
          </div>
          <div className="p-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-[12px] p-6 text-center cursor-pointer transition-all
                ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-black/15 dark:border-white/15 hover:border-blue-400 hover:bg-blue-500/5'}
              `}
            >
              <Paperclip className="w-8 h-8 text-[#8E8E93] mx-auto mb-2" />
              <p className="text-[14px] font-medium text-black dark:text-white">Appuyez ou glissez-déposez</p>
              <p className="text-[12px] text-[#8E8E93] mt-1">PDF, Word, Texte, Images</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'PDF', icon: <FileText className="w-4 h-4 text-red-500" />, ext: '.pdf' },
                { label: 'Word', icon: <FileText className="w-4 h-4 text-blue-500" />, ext: '.docx' },
                { label: 'Texte', icon: <FileText className="w-4 h-4 text-gray-500" />, ext: '.txt' },
                { label: 'JPEG', icon: <ImageIcon className="w-4 h-4 text-orange-500" />, ext: '.jpg' },
                { label: 'PNG', icon: <ImageIcon className="w-4 h-4 text-purple-500" />, ext: '.png' },
                { label: 'WebP', icon: <ImageIcon className="w-4 h-4 text-green-500" />, ext: '.webp' },
              ].map((t) => (
                <div key={t.ext} className="flex items-center gap-1.5 bg-white dark:bg-white/5 rounded-[8px] px-2.5 py-2 border border-black/8 dark:border-white/8">
                  {t.icon}
                  <span className="text-[11px] font-medium text-black dark:text-white">{t.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 mt-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-[10px] px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">Limite de {MAX_FILE_SIZE_MB} Mo</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-500/80 mt-0.5">Les fichiers dépassant cette limite seront refusés.</p>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 mt-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-[10px] px-3 py-2.5">
                <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
          <div className="px-4 pb-safe pb-4">
            <button onClick={onClose} className="w-full bg-white dark:bg-white/10 rounded-[12px] py-[14px] text-[17px] font-semibold text-[#007AFF] active:opacity-70 transition-opacity">Annuler</button>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ''; }} />
        </div>
      </div>
    </>
  );
}

// ─── Sidebar (Conversations) ────────────────────────────────────────────────

interface SidebarProps {
  user: { fullName: string; role: string; photoUrl?: string };
  conversations: ConversationSummary[];
  activeConversation: Conversation | null;
  search: string;
  setSearch: (v: string) => void;
  loadConversations: (q?: string) => void;
  loadConversation: (id: string) => void;
  createNewConversation: () => void;
  toggleFavorite: (conv: ConversationSummary, e: React.MouseEvent) => void;
  togglePin: (conv: ConversationSummary, e: React.MouseEvent) => void;
  deleteConversation: (id: string, e: React.MouseEvent) => void;
  deleteAllData: () => void;
  isMobile: boolean;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  formatDate: (iso: string) => string;
}

function Sidebar({
  user,
  conversations,
  activeConversation,
  search,
  setSearch,
  loadConversations,
  loadConversation,
  createNewConversation,
  toggleFavorite,
  togglePin,
  deleteConversation,
  deleteAllData,
  isMobile,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  sidebarOpen,
  setSidebarOpen,
  formatDate,
}: SidebarProps) {
  return (
    <div className="h-full flex flex-col bg-[#0D0D0D] dark:bg-[#0D0D0D] border-r border-white/5">
      <div className="p-3 sm:p-4 flex items-center justify-between border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-wide hidden sm:inline">Gradie</span>
        </div>
        {isMobile && (
          <button onClick={() => setMobileSidebarOpen(false)} className="text-white/60 hover:text-white p-1"><X className="w-5 h-5" /></button>
        )}
        {!isMobile && (
          <button onClick={createNewConversation} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95">
            <Plus className="w-3.5 h-3.5" /> Nouveau
          </button>
        )}
      </div>

      {isMobile && (
        <div className="p-3 border-b border-white/5">
          <button onClick={createNewConversation} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2.5 rounded-lg transition-all">
            <Plus className="w-4 h-4" /> Nouvelle conversation
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); loadConversations(e.target.value); }} placeholder="Rechercher…" className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-white text-xs outline-none focus:border-blue-500/50" />
        </div>
        {conversations.length === 0 && (
          <div className="text-center text-white/30 text-xs mt-8 px-4">Aucune conversation.<br />Commencez à parler avec Gradie !</div>
        )}
        {conversations.map((conv) => (
          <div key={conv.id} onClick={() => loadConversation(conv.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadConversation(conv.id); }} role="button" tabIndex={0} className={`w-full text-left p-3 rounded-xl transition-all group cursor-pointer ${activeConversation?.id === conv.id ? 'bg-blue-600/40 border border-blue-500/50' : 'hover:bg-white/5 border border-transparent'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {conv.pinned && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                  <p className="text-white text-xs font-medium truncate">{conv.title}</p>
                </div>
                {conv.messages[0] && <p className="text-white/40 text-[11px] truncate mt-0.5">{conv.messages[0].content}</p>}
                <p className="text-white/25 text-[10px] mt-1">{formatDate(conv.updatedAt)}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={(e) => toggleFavorite(conv, e)} className={`p-1 rounded transition-all ${conv.favorite ? 'text-yellow-400' : 'text-white/30 hover:text-white/60 opacity-0 group-hover:opacity-100'}`} style={{ opacity: isMobile || conv.favorite ? 1 : undefined }} title="Favori"><Star className="w-3 h-3" fill={conv.favorite ? 'currentColor' : 'none'} /></button>
                <button onClick={(e) => togglePin(conv, e)} className={`p-1 rounded transition-all ${conv.pinned ? 'text-amber-400' : 'text-white/30 hover:text-white/60 opacity-0 group-hover:opacity-100'}`} style={{ opacity: isMobile || conv.pinned ? 1 : undefined }} title="Épingler"><Pin className="w-3 h-3" fill={conv.pinned ? 'currentColor' : 'none'} /></button>
                <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id, e); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 rounded transition-all" style={{ opacity: isMobile ? 1 : undefined }}><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 flex-shrink-0">
        <button onClick={deleteAllData} className="w-full flex items-center gap-2 text-red-400/70 hover:text-red-300 text-xs py-2 px-3 rounded-lg hover:bg-red-500/10 transition-all"><Trash2 className="w-3 h-3" /> Supprimer toutes mes données</button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GradieChat({ userId, schoolId, userRole, userName }: GradieChatProps) {
  // State
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('fr-FR');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // ─── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
      if (w >= 768) { setSidebarOpen(true); setMobileSidebarOpen(false); } else { setSidebarOpen(false); }
    };
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check);
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => () => { recognitionRef.current?.stop?.(); if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  // ─── Scroll ────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => { messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' }); }, []);
  const handleScroll = useCallback(() => {
    const c = messagesContainerRef.current; if (!c) return;
    const { scrollTop, scrollHeight, clientHeight } = c;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom && scrollHeight > clientHeight * 1.5);
  }, []);
  useEffect(() => { const c = messagesContainerRef.current; if (c) { c.addEventListener('scroll', handleScroll); return () => c.removeEventListener('scroll', handleScroll); } }, [handleScroll]);
  useEffect(() => { if (isAtBottom) scrollToBottom(true); }, [activeConversation?.messages, streamingContent, scrollToBottom, isAtBottom]);

  // ─── Textarea auto-height ────────────────────────────────────────────────
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`; } }, [input]);

  // ─── Load conversations ──────────────────────────────────────────────────
  const loadConversations = useCallback(async (q?: string) => {
    try { const params = new URLSearchParams({ userId }); if (q?.trim()) params.set('search', q.trim()); const res = await fetch(`/api/ai/conversations?${params.toString()}`); if (res.ok) { const data = await res.json(); setConversations(data.conversations || []); } } catch { /* silent */ }
  }, [userId]);

  // ─── Favorite / Pin ──────────────────────────────────────────────────────
  const toggleFavorite = async (conv: ConversationSummary, e: React.MouseEvent) => { e.stopPropagation(); try { await fetch(`/api/ai/conversations/${conv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, favorite: !conv.favorite }) }); setConversations(p => p.map(c => c.id === conv.id ? { ...c, favorite: !conv.favorite } : c)); } catch { } };
  const togglePin = async (conv: ConversationSummary, e: React.MouseEvent) => { e.stopPropagation(); try { await fetch(`/api/ai/conversations/${conv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, pinned: !conv.pinned }) }); setConversations(p => p.map(c => c.id === conv.id ? { ...c, pinned: !conv.pinned } : c)); } catch { } };

  // ─── Regenerate ────────────────────────────────────────────────────────────
  const regenerateLast = async () => {
    if (isStreaming || !activeConversation) return;
    const msgs = activeConversation.messages;
    let targetIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'user') { targetIdx = i; break; } }
    if (targetIdx === -1) return;
    const userMsg = msgs[targetIdx];
    setActiveConversation(p => p ? { ...p, messages: p.messages.slice(0, targetIdx + 1) } : null);
    sendMessage(userMsg.content);
  };

  // ─── Export ────────────────────────────────────────────────────────────────
  const exportConversation = (format: 'md' | 'doc') => {
    if (!activeConversation) return;
    const lines = activeConversation.messages.map(m => m.role === 'user' ? `**Vous** : ${m.content}` : `**Gradie** : ${m.content}`);
    const body = `# ${activeConversation.title}\n\n${lines.join('\n\n')}`;
    if (format === 'md') { const blob = new Blob([body], { type: 'text/markdown' }); downloadBlob(blob, `${activeConversation.title}.md`); }
    else { const html = `<html><head><meta charset='utf-8'></head><body><h1>${activeConversation.title}</h1>${lines.map(l => `<p>${l.replace(/\n/g, '<br/>')}</p>`).join('')}</body></html>`; const blob = new Blob([html], { type: 'application/msword' }); downloadBlob(blob, `${activeConversation.title}.doc`); }
  };
  const downloadBlob = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };

  // ─── TTS ───────────────────────────────────────────────────────────────────
  const speakMessage = (text: string) => { if (typeof window === 'undefined' || !('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const utter = new SpeechSynthesisUtterance(text.replace(/[*`#]/g, '')); utter.lang = language; utter.rate = 1; window.speechSynthesis.speak(utter); };

  // ─── Voice ─────────────────────────────────────────────────────────────────
  const startVoice = () => { if (typeof window === 'undefined' || !(window as any).webkitSpeechRecognition && !(window as any).SpeechRecognition) return; const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; const rec = new SR(); rec.lang = language; rec.interimResults = false; rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(p => p ? `${p} ${t}` : t); }; rec.onend = () => setListening(false); rec.onerror = () => setListening(false); recognitionRef.current = rec; rec.start(); setListening(true); };

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ─── Load conversation ────────────────────────────────────────────────────
  const loadConversation = useCallback(async (id: string) => { setIsLoading(true); setError(null); try { const res = await fetch(`/api/ai/conversations/${id}?userId=${userId}`); if (res.ok) { const data = await res.json(); setActiveConversation(data.conversation); if (isMobile) setMobileSidebarOpen(false); } } catch { setError('Impossible de charger la conversation.'); } finally { setIsLoading(false); } }, [userId, isMobile]);

  // ─── New conversation ─────────────────────────────────────────────────────
  const createNewConversation = async () => { try { const res = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) }); if (res.ok) { const data = await res.json(); await loadConversations(); await loadConversation(data.conversation.id); if (isMobile) setMobileSidebarOpen(false); } } catch { setError('Impossible de créer une nouvelle conversation.'); } };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const deleteConversation = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); try { await fetch(`/api/ai/conversations/${id}?userId=${userId}`, { method: 'DELETE' }); if (activeConversation?.id === id) setActiveConversation(null); await loadConversations(); } catch { } };

  // ─── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (override?: string) => {
    const msg = (override ?? input).trim(); if (!msg || isStreaming) return;
    setInput(''); setError(null);

    let convId = activeConversation?.id;
    if (!convId) { const res = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) }); if (res.ok) { const data = await res.json(); convId = data.conversation.id; await loadConversation(convId!); } }

    const userMsg: AiMessage = { id: Date.now().toString(), role: 'user', content: msg, createdAt: new Date().toISOString() };
    setActiveConversation(p => p ? { ...p, messages: [...p.messages, userMsg] } : null);

    setIsStreaming(true); setStreamingContent('');

    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, schoolId, userId, context: userRole === 'STUDENT' ? 'grades' : userRole === 'TEACHER' ? 'teacher' : userRole === 'ADMIN' ? 'admin' : undefined, conversationId: convId }) });
      if (!res.ok || !res.body) { let m = 'Erreur du serveur.'; try { const d = await res.json(); m = d.error || m; } catch { const t = await res.text().catch(() => ''); m = t ? t.slice(0, 240) : 'Erreur inconnue.'; } setError(m); setIsStreaming(false); return; }

      const reader = res.body.getReader(); const decoder = new TextDecoder(); let acc = ''; let finalConvId = convId;
      while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value, { stream: true }); const lines = chunk.split('\n').filter(l => l.startsWith('data:')); for (const line of lines) { const json = line.replace(/^data:\s*/, '').trim(); try { const p = JSON.parse(json); if (p.token) { acc += p.token; setStreamingContent(acc); } if (p.conversationId) finalConvId = p.conversationId; if (p.done) { const am: AiMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: acc, createdAt: new Date().toISOString() }; setActiveConversation(p => p ? { ...p, messages: [...p.messages, am] } : null); setStreamingContent(''); } } catch { } } }
      await loadConversations();
      if (finalConvId && finalConvId !== activeConversation?.id) await loadConversation(finalConvId);
    } catch { setError('Impossible de contacter Gradie. Vérifiez votre connexion.'); } finally { setIsStreaming(false); }
  };

  // ─── Upload ────────────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!file) return; if (file.size > MAX_FILE_SIZE_BYTES) { setError(`Fichier trop volumineux (${formatSize(file.size)}). Limite : ${MAX_FILE_SIZE_MB} Mo.`); return; }
    let convId = activeConversation?.id; if (!convId) { const res = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) }); if (res.ok) { const data = await res.json(); convId = data.conversation.id; } }
    setUploadProgress(0); setError(null);
    const fd = new FormData(); fd.append('file', file); fd.append('conversationId', convId!); fd.append('userId', userId);
    try { setUploadProgress(30); const res = await fetch('/api/ai/upload', { method: 'POST', body: fd }); setUploadProgress(80); if (res.ok) { setUploadProgress(100); setUploadSuccess(file.name); setTimeout(() => setUploadSuccess(null), 3000); await loadConversation(convId!); await loadConversations(); } else { const err = await res.json(); setError(err.error || 'Erreur upload.'); } } catch { setError('Impossible d\'envoyer le fichier.'); } finally { setTimeout(() => setUploadProgress(null), 1000); }
  };

  // ─── Delete all ────────────────────────────────────────────────────────────
  const deleteAllData = async () => { if (!confirm('Supprimer TOUTES vos conversations ? Irréversible.')) return; try { await fetch(`/api/user/data?userId=${userId}`, { method: 'DELETE' }); setActiveConversation(null); setConversations([]); } catch { } };

  // ─── Keyboard ──────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  // ─── Virtualizer for messages ──────────────────────────────────────────────

  const virtualizer = useVirtualizer({
    count: activeConversation?.messages?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    horizontal: false,
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes iosTypingDot { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
        @keyframes iosFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes iosSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
        .animate-ios-fade-in { animation: iosFadeIn 0.25s ease-out; }
        .animate-ios-sheet-up { animation: iosSheetUp 0.35s cubic-bezier(0.32,0.72,0,1); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-pulse-ring::before { content: ''; position: absolute; inset: -2px; border-radius: 9999px; border: 2px solid currentColor; animation: pulse-ring 1.5s ease-out infinite; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: oklch(0.55 0.15 260 / 0.5); border-radius: 3px; border: 2px solid transparent; background-clip: content-box; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: oklch(0.50 0.18 260 / 0.8); }
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: oklch(0.55 0.15 260 / 0.5) transparent; }
        .imessage-user-bubble { border-radius: 18px 18px 4px 18px; }
        .imessage-ai-bubble { border-radius: 18px 18px 18px 4px; }
        .message-bubble { max-width: 75%; }
        @media (max-width: 480px) { .message-bubble { max-width: 88% !important; } }
        @media (min-width: 481px) and (max-width: 768px) { .message-bubble { max-width: 82% !important; } }
        @media (min-width: 1025px) and (max-width: 1366px) { .message-bubble { max-width: 72% !important; } }
        @media (min-width: 1367px) { .message-bubble { max-width: 65% !important; } }
        .input-safe-area { padding-bottom: env(safe-area-inset-bottom, 8px); }
        .chat-container { max-width: 1100px; }
        @media (max-width: 768px) { .chat-container { max-width: 100%; } }
      `}</style>

      <div className="flex h-dvh bg-gradient-to-br from-[#0A0A0F] via-[#0F1629] to-[#0A0A0F] rounded-xl overflow-hidden shadow-2xl relative">
        {/* Upload Sheet */}
        {showUploadSheet && <UploadActionSheet onClose={() => setShowUploadSheet(false)} onSelectFile={handleFileUpload} />}

        {/* Mobile Sidebar Overlay */}
        {isMobile && mobileSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />}

        {/* Sidebar Desktop */}
        {!isMobile && <aside className={`${sidebarOpen ? 'w-72 lg:w-80' : 'w-0'} transition-all duration-300 flex-shrink-0 overflow-hidden`}><Sidebar user={{ fullName: userName || 'Utilisateur', role: userRole || 'STUDENT', photoUrl: undefined }} conversations={conversations} activeConversation={activeConversation} search={search} setSearch={setSearch} loadConversations={loadConversations} loadConversation={loadConversation} createNewConversation={createNewConversation} toggleFavorite={toggleFavorite} togglePin={togglePin} deleteConversation={deleteConversation} deleteAllData={deleteAllData} isMobile={isMobile} mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} formatDate={formatDate} /></aside>}

        {/* Mobile Sidebar */}
        {isMobile && <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}><Sidebar user={{ fullName: userName || 'Utilisateur', role: userRole || 'STUDENT', photoUrl: undefined }} conversations={conversations} activeConversation={activeConversation} search={search} setSearch={setSearch} loadConversations={loadConversations} loadConversation={loadConversation} createNewConversation={createNewConversation} toggleFavorite={toggleFavorite} togglePin={togglePin} deleteConversation={deleteConversation} deleteAllData={deleteAllData} isMobile={isMobile} mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} formatDate={formatDate} /></div>}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative chat-container mx-auto w-full">
          {/* Header */}
          <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/5 bg-black/20 backdrop-blur-sm flex-shrink-0 z-10">
            <button onClick={() => isMobile ? setMobileSidebarOpen(true) : setSidebarOpen(!sidebarOpen)} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center">{isMobile && !mobileSidebarOpen || !isMobile && !sidebarOpen ? <MessageSquare className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5 hidden sm:block" />}</button>
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20"><span className="text-white text-xs sm:text-sm font-bold">G</span></div>
              <div className="min-w-0"><p className="text-white font-semibold text-sm sm:text-base truncate">{activeConversation ? activeConversation.title : 'Gradie'}</p><div className="flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span><p className="text-white/40 text-[10px] sm:text-xs">En ligne</p></div></div>
            </div>
            {activeConversation && !isMobile && <div className="flex items-center gap-1.5 flex-shrink-0"><button onClick={() => exportConversation('md')} className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all" title="Exporter Markdown"><Download className="w-4 h-4" /></button><button onClick={regenerateLast} disabled={isStreaming} className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30" title="Régénérer"><RotateCcw className="w-4 h-4" /></button></div>}
          </header>

          {/* Messages */}
          <div ref={parentRef} className="flex-1 overflow-hidden min-h-0" style={{ height: '100%' }}>
            <div ref={messagesContainerRef} className="h-full overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 scrollbar-thin" style={{ overscrollBehavior: 'contain' }}>
              {isLoading && <div className="flex items-center justify-center h-32"><div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}</div></div>}

              {!activeConversation && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 sm:gap-6 px-4 py-8">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30"><span className="text-white text-4xl sm:text-5xl font-bold">G</span></div>
                  <div><h2 className="text-white text-xl sm:text-2xl font-bold mb-2">Bonjour{userName ? `, ${userName}` : ''} !</h2><p className="text-white/50 text-sm sm:text-base max-w-sm">Je suis Gradie, votre assistante IA scolaire.<br />Posez-moi une question ou partagez un document.</p></div>
                  <button onClick={createNewConversation} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/25 text-sm sm:text-base min-h-[48px]"><Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Commencer une conversation</button>
                </div>
              )}

              {/* Virtualized messages */}
              {activeConversation && (
                <div ref={messagesContainerRef} style={{ height: '100%', width: '100%' }}>
                  <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                    {virtualizer.getVirtualItems().map((virtualRow) => (
                      <div key={virtualRow.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}>
                        {(() => {
                          const msg = activeConversation.messages[virtualRow.index];
                          const isUser = msg.role === 'user';
                          const total = activeConversation.messages.length;
                          const isLast = virtualRow.index === total - 1;
                          const showTimestamp = isLast || (virtualRow.index + 1 < total && new Date(activeConversation.messages[virtualRow.index + 1].createdAt).getTime() - new Date(msg.createdAt).getTime() > 5 * 60 * 1000);

                          if (isStreaming && isLast && msg.role === 'assistant' && streamingContent) {
                            return (
                              <div className="flex flex-col items-start animate-fade-in" style={{ height: 80 }}>
                                <div className="flex items-end gap-1.5">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 self-end shadow-md shadow-blue-500/20"><span className="text-white text-[10px] font-bold">G</span></div>
                                  <div className="message-bubble bg-[#E9E9EB] dark:bg-white/10 imessage-ai-bubble px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm" style={{ maxWidth: '75%' }}><p className="text-[10px] font-semibold text-[#007AFF] dark:text-blue-400 mb-0.5">Gradie</p><div className="message-bubble-text break-words leading-relaxed text-black dark:text-white/90" dangerouslySetInnerHTML={{ __html: renderMessage(streamingContent) }} /><span className="inline-block w-[2px] h-[16px] bg-[#007AFF] animate-pulse ml-0.5 align-middle rounded-full" /></div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}>
                              <div className={`flex items-end gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-full`}>
                                {!isUser && <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 self-end shadow-md shadow-blue-500/20"><span className="text-white text-[10px] font-bold">G</span></div>}
                                <div className={`message-bubble px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm group ${isUser ? 'bg-[#007AFF] text-white imessage-user-bubble' : 'bg-[#E9E9EB] dark:bg-white/10 text-black dark:text-white/90 imessage-ai-bubble'}`} style={{ maxWidth: '75%' }}>
                                  {!isUser && <p className="text-[10px] font-semibold text-[#007AFF] dark:text-blue-400 mb-0.5">Gradie</p>}
                                  <div className="message-bubble-text break-words leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }} />
                                  {!isUser && <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => navigator.clipboard?.writeText(msg.content)} className="text-[#007AFF] dark:text-blue-400 hover:opacity-70 p-0.5" title="Copier"><Copy className="w-3.5 h-3.5" /></button><button onClick={() => speakMessage(msg.content)} className="text-[#007AFF] dark:text-blue-400 hover:opacity-70 p-0.5" title="Lire à voix haute"><Volume2 className="w-3.5 h-3.5" /></button>{isLast && <button onClick={regenerateLast} className="text-[#007AFF] dark:text-blue-400 hover:opacity-70 p-0.5" title="Régénérer"><RotateCcw className="w-3.5 h-3.5" /></button>}</div>}
                                </div>
                              </div>
                              {showTimestamp && <p className={`text-[10px] text-white/25 mt-1 ${isUser ? 'mr-2' : 'ml-9'}`}>{formatDate(msg.createdAt)}</p>}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Streaming placeholder when no messages yet */}
              {isStreaming && (!activeConversation || (activeConversation && activeConversation.messages.length === 0)) && streamingContent && (
                <div className="flex flex-col items-start animate-fade-in">
                  <div className="flex items-end gap-1.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 self-end shadow-md shadow-blue-500/20"><span className="text-white text-[10px] font-bold">G</span></div>
                    <div className="message-bubble bg-[#E9E9EB] dark:bg-white/10 imessage-ai-bubble px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm" style={{ maxWidth: isMobile ? '88%' : '75%' }}><p className="text-[10px] font-semibold text-[#007AFF] dark:text-blue-400 mb-0.5">Gradie</p><div className="message-bubble-text break-words leading-relaxed text-black dark:text-white/90" dangerouslySetInnerHTML={{ __html: renderMessage(streamingContent) }} /><span className="inline-block w-[2px] h-[16px] bg-[#007AFF] animate-pulse ml-0.5 align-middle rounded-full" /></div>
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && <TypingIndicator />}

              {error && <div className="flex justify-center animate-fade-in"><div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 text-xs px-4 py-2 rounded-xl"><X className="w-3 h-3 flex-shrink-0" /><span>{error}</span></div></div>}

              {uploadSuccess && <div className="flex justify-center animate-fade-in"><div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2 rounded-xl"><CheckCircle2 className="w-3 h-3 flex-shrink-0" /><span>« {uploadSuccess} » envoyé</span></div></div>}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && <button onClick={() => scrollToBottom(true)} className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/10 text-white/70 hover:text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-lg transition-all hover:bg-white/20 animate-fade-in"><ChevronDown className="w-3.5 h-3.5" />Revenir en bas</button>}

          {/* Documents bar */}
          {activeConversation && (activeConversation.documents?.length ?? 0) > 0 && <div className="px-3 sm:px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-thin bg-black/10">{activeConversation.documents.map(doc => <div key={doc.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 sm:px-3 py-1.5 flex-shrink-0"><Paperclip className="w-3 h-3 text-blue-400 flex-shrink-0" /><span className="text-white/70 text-[11px] sm:text-xs truncate max-w-[100px] sm:max-w-32">{doc.name}</span></div>)}</div>}

          {/* Input Bar - ALWAYS FIXED AT BOTTOM */}
          <div className="flex-shrink-0 bg-black/10 backdrop-blur-sm border-t border-white/5 p-3 sm:p-4 input-safe-area">
            <div className="max-w-[1100px] mx-auto">
              {/* Upload progress */}
              {uploadProgress !== null && <div className="mb-2 flex items-center gap-2 text-xs text-blue-400"><div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} /></div><span>{uploadProgress}%</span></div>}

              <div className="relative flex items-end gap-2">
                {/* Voice button */}
                <button type="button" onClick={listening ? () => recognitionRef.current?.stop() : startVoice} disabled={isStreaming || listening} className={`flex-shrink-0 p-2 rounded-xl transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'text-white/50 hover:text-white hover:bg-white/10'} disabled:opacity-30`} title={listening ? 'Arrêter' : 'Dictée vocale'}><Mic className="w-5 h-5" /></button>

                {/* Attach button */}
                <button type="button" onClick={() => setShowUploadSheet(true)} disabled={isStreaming} className="flex-shrink-0 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30" title="Joindre un fichier"><Paperclip className="w-5 h-5" /></button>

                {/* Textarea - auto-grow */}
                <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isStreaming ? 'Gradie répond…' : 'Écrivez un message…'} disabled={isStreaming} rows={1} className="flex-1 min-h-[44px] max-h-[128px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 resize-none transition-all disabled:opacity-50" style={{ fontSize: '15px', lineHeight: '1.5' }} />

                {/* Send button */}
                <button type="button" onClick={() => sendMessage()} disabled={!input.trim() || isStreaming} className="flex-shrink-0 p-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Envoyer"><Send className="w-5 h-5 text-white" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay close on route change */}
      {isMobile && mobileSidebarOpen && <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileSidebarOpen(false)} />}

      {/* Sidebar Mobile Sheet (legacy) */}
      {isMobile && mobileSidebarOpen && <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 translate-x-0"><Sidebar user={{ fullName: userName || 'Utilisateur', role: userRole || 'STUDENT', photoUrl: undefined }} conversations={conversations} activeConversation={activeConversation} search={search} setSearch={setSearch} loadConversations={loadConversations} loadConversation={loadConversation} createNewConversation={createNewConversation} toggleFavorite={toggleFavorite} togglePin={togglePin} deleteConversation={deleteConversation} deleteAllData={deleteAllData} isMobile={isMobile} mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} formatDate={formatDate} /></div>}

      {/* Legacy Sidebar Desktop */}
      {!isMobile && <aside className={`${sidebarOpen ? 'w-72 lg:w-80' : 'w-0'} transition-all duration-300 flex-shrink-0 overflow-hidden`}><Sidebar user={{ fullName: userName || 'Utilisateur', role: userRole || 'STUDENT', photoUrl: undefined }} conversations={conversations} activeConversation={activeConversation} search={search} setSearch={setSearch} loadConversations={loadConversations} loadConversation={loadConversation} createNewConversation={createNewConversation} toggleFavorite={toggleFavorite} togglePin={togglePin} deleteConversation={deleteConversation} deleteAllData={deleteAllData} isMobile={isMobile} mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} formatDate={formatDate} /></aside>}

    </>
  );
}