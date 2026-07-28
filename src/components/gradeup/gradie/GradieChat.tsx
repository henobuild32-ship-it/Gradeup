'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  Paperclip,
  Trash2,
  X,
  ChevronLeft,
  Search,
  Star,
  Pin,
  Copy,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Download,
  RotateCcw,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Settings,
  Check,
  StopCircle,
  Share2,
  Archive,
  Edit2,
  Bot,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import GradieWelcome from './GradieWelcome';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  if (isToday)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function renderMessage(content: string) {
  // Escape HTML first
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(
      /`(.*?)`/g,
      '<code class="inline-code">$1</code>'
    )
    .replace(/\n/g, '<br/>');
}

function groupConversationsByDate(convs: ConversationSummary[]) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const groups: Record<string, ConversationSummary[]> = {
    '⭐ Favoris': [],
    '📌 Épinglées': [],
    '📅 Aujourd\'hui': [],
    '📅 Hier': [],
    '📅 Cette semaine': [],
    '📅 Ce mois-ci': [],
    '📅 Anciennes': [],
  };

  for (const c of convs) {
    if (c.favorite) { groups['⭐ Favoris'].push(c); continue; }
    if (c.pinned) { groups['📌 Épinglées'].push(c); continue; }
    const d = new Date(c.updatedAt);
    if (d.toDateString() === today) { groups['📅 Aujourd\'hui'].push(c); continue; }
    if (d.toDateString() === yesterday) { groups['📅 Hier'].push(c); continue; }
    if (d > weekAgo) { groups['📅 Cette semaine'].push(c); continue; }
    if (d > monthAgo) { groups['📅 Ce mois-ci'].push(c); continue; }
    groups['📅 Anciennes'].push(c);
  }

  return Object.entries(groups).filter(([, v]) => v.length > 0);
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-1 animate-gradi-fadein">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="gradi-bubble-ai px-4 py-3">
        <div className="flex gap-[5px] items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-white/40"
              style={{ animation: `gradi-typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Message Action Bar ──────────────────────────────────────────────────────

interface MessageActionBarProps {
  content: string;
  isLast: boolean;
  isMobile: boolean;
  onRegenerate: () => void;
  onSpeak: () => void;
  isSpeaking: boolean;
}

function MessageActionBar({ content, isLast, isMobile, onRegenerate, onSpeak, isSpeaking }: MessageActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex items-center gap-1 mt-1.5 transition-all duration-200 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
      <button
        onClick={handleCopy}
        className="gradi-action-btn"
        title={copied ? 'Copié !' : 'Copier'}
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
      <button onClick={onSpeak} className="gradi-action-btn" title={isSpeaking ? 'Arrêter la lecture' : 'Lire'}>
        {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      </button>
      {isLast && (
        <button onClick={onRegenerate} className="gradi-action-btn" title="Régénérer">
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
      <button
        onClick={() => {
          if (navigator.share) {
            navigator.share({ text: content }).catch(() => {});
          }
        }}
        className="gradi-action-btn"
        title="Partager"
      >
        <Share2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Single Message Item ─────────────────────────────────────────────────────

interface MessageItemProps {
  msg: AiMessage;
  idx: number;
  total: number;
  isStreaming: boolean;
  streamingContent: string;
  isMobile: boolean;
  formatDate: (iso: string) => string;
  speakMessage: (text: string) => void;
  isSpeaking: boolean;
  speakingMsgId: string | null;
  onRegenerate: () => void;
}

const MessageItem = memo(function MessageItem({
  msg,
  idx,
  total,
  isStreaming,
  streamingContent,
  isMobile,
  speakMessage,
  isSpeaking,
  speakingMsgId,
  onRegenerate,
}: MessageItemProps) {
  const isUser = msg.role === 'user';
  const isLast = idx === total - 1;
  const showTimestamp =
    isLast ||
    (idx + 1 < total);

  // Render streaming version for last assistant message
  if (isStreaming && isLast && msg.role === 'assistant' && streamingContent) {
    return (
      <div className="flex flex-col items-start mb-1 animate-gradi-fadein">
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="gradi-bubble-ai">
            <p className="text-[10px] font-semibold text-indigo-400 mb-0.5">Gradie</p>
            <div
              className="gradi-msg-text"
              dangerouslySetInnerHTML={{ __html: renderMessage(streamingContent) }}
            />
            <span className="inline-block w-[2px] h-[15px] bg-indigo-400 animate-pulse ml-0.5 align-middle rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-1 animate-gradi-fadein`}>
      <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 self-end shadow-md shadow-indigo-500/20">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <div
          className={`group relative ${
            isUser ? 'gradi-bubble-user' : 'gradi-bubble-ai'
          }`}
        >
          {!isUser && (
            <p className="text-[10px] font-semibold text-indigo-400 mb-0.5">Gradie</p>
          )}
          <div
            className="gradi-msg-text"
            dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }}
          />
          {!isUser && (
            <MessageActionBar
              content={msg.content}
              isLast={isLast}
              isMobile={isMobile}
              onRegenerate={onRegenerate}
              onSpeak={() => speakMessage(msg.content)}
              isSpeaking={speakingMsgId === msg.id && isSpeaking}
            />
          )}
        </div>
      </div>
      {showTimestamp && (
        <p className={`text-[10px] text-white/25 mt-0.5 ${isUser ? 'mr-2' : 'ml-9'}`}>
          {formatDate(msg.createdAt)}
        </p>
      )}
    </div>
  );
});

// ─── Upload Action Sheet ─────────────────────────────────────────────────────

function UploadActionSheet({
  onClose,
  onSelectFile,
}: {
  onClose: () => void;
  onSelectFile: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Fichier trop volumineux (${formatSize(file.size)}). Limite : ${MAX_FILE_SIZE_MB} Mo`);
      return;
    }
    onSelectFile(file);
    onClose();
  };

  const fileTypes = [
    { label: 'Document', icon: <FileText className="w-5 h-5 text-blue-400" />, accept: '.pdf,.docx,.txt' },
    { label: 'Photo', icon: <ImageIcon className="w-5 h-5 text-purple-400" />, accept: 'image/*' },
    { label: 'Tous fichiers', icon: <Paperclip className="w-5 h-5 text-white/60" />, accept: '.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.mp3,.mp4,.zip' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 animate-gradi-fadein" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-gradi-sheet-up max-w-lg mx-auto">
        <div className="bg-[#1C1C1E] rounded-t-3xl overflow-hidden shadow-2xl">
          {/* Drag handle */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="px-5 pb-2">
            <h3 className="text-white font-semibold text-center text-base mb-1">Joindre un fichier</h3>
            <p className="text-white/40 text-xs text-center">Limite : {MAX_FILE_SIZE_MB} Mo par fichier</p>
          </div>

          <div className="px-4 pb-2 grid grid-cols-3 gap-3">
            {fileTypes.map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = t.accept;
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 active:scale-95 rounded-2xl p-4 transition-all"
              >
                {t.icon}
                <span className="text-white/80 text-[11px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div className="px-4 pb-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/15 hover:border-indigo-400 hover:bg-indigo-500/5'}`}
            >
              <Paperclip className="w-7 h-7 text-white/30 mx-auto mb-2" />
              <p className="text-white/60 text-sm font-medium">Glissez-déposez un fichier</p>
              <p className="text-white/30 text-xs mt-0.5">PDF, Word, Images, Audio, Vidéo</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}
          </div>

          <div className="px-4 pb-safe-or-4" style={{ paddingBottom: `max(env(safe-area-inset-bottom), 16px)` }}>
            <button
              onClick={onClose}
              className="w-full bg-white/5 active:bg-white/10 rounded-2xl py-4 text-white/80 font-semibold text-base transition-all"
            >
              Annuler
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </div>
      </div>
    </>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [responseLength, setResponseLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [tone, setTone] = useState('Pédagogique');

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 animate-gradi-fadein" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-gradi-sheet-up max-w-lg mx-auto">
        <div className="bg-[#1C1C1E] rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <div className="pt-3 pb-1 flex justify-center sticky top-0 bg-[#1C1C1E]">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
          <div className="px-5 pb-2 flex items-center justify-between sticky top-5 bg-[#1C1C1E]">
            <h3 className="text-white font-bold text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-400" /> Paramètres</h3>
            <button onClick={onClose} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
          </div>

          <div className="px-5 pb-6 space-y-6 mt-2">
            {/* Response Length */}
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">📏 Longueur des réponses</p>
              <div className="flex gap-2">
                {(['short', 'medium', 'long'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setResponseLength(v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${responseLength === v ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    {v === 'short' ? 'Courte' : v === 'medium' ? 'Moyenne' : 'Détaillée'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">🎭 Ton des réponses</p>
              <div className="grid grid-cols-2 gap-2">
                {['Professionnel', 'Pédagogique', 'Simple', 'Créatif'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${tone === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">🎨 Thème</p>
              <div className="flex gap-2">
                {['Sombre', 'Clair', 'Système'].map((t) => (
                  <button
                    key={t}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${t === 'Sombre' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Gradie IA</p>
                <p className="text-white/40 text-xs">Version 2.5.0 • <span className="text-indigo-400">GradeUp</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  user: { fullName: string; role: string };
  conversations: ConversationSummary[];
  activeConversation: Conversation | null;
  search: string;
  setSearch: (v: string) => void;
  loadConversations: (q?: string) => void;
  loadConversation: (id: string) => void;
  createNewConversation: () => void;
  toggleFavorite: (c: ConversationSummary, e: React.MouseEvent) => void;
  togglePin: (c: ConversationSummary, e: React.MouseEvent) => void;
  deleteConversation: (id: string, e: React.MouseEvent) => void;
  deleteAllData: () => void;
  isMobile: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
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
  setMobileSidebarOpen,
  setSidebarOpen,
}: SidebarProps) {
  const groups = groupConversationsByDate(conversations);
  const [showSettings, setShowSettings] = useState(false);

  const close = () => {
    if (isMobile) setMobileSidebarOpen(false);
    else setSidebarOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#111115] border-r border-white/5 overflow-hidden">
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Header */}
      <div className="px-4 pt-safe-or-4 pb-3 flex items-center justify-between border-b border-white/5 flex-shrink-0" style={{ paddingTop: `max(env(safe-area-inset-top, 0px), 16px)` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Gradie</p>
            <p className="text-white/40 text-[10px] mt-0.5">{user.fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={createNewConversation}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
            title="Nouvelle conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={close} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-white/5 flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); loadConversations(e.target.value); }}
            placeholder="Rechercher une conversation…"
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-8.5 pr-3 py-2 text-white text-xs outline-none focus:border-indigo-500/60 placeholder:text-white/25 transition-colors"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto py-1 gradi-scrollbar">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 px-6 text-center">
            <MessageSquare className="w-8 h-8 text-white/15 mb-2" />
            <p className="text-white/30 text-xs">Aucune conversation.<br />Commencez à parler avec Gradie !</p>
          </div>
        )}

        {groups.map(([groupLabel, convList]) => (
          <div key={groupLabel} className="mt-1">
            <p className="px-4 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-widest">{groupLabel}</p>
            {convList.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  loadConversation(conv.id);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { loadConversation(conv.id); if (isMobile) setMobileSidebarOpen(false); } }}
                className={`mx-2 mb-0.5 px-3 py-2.5 rounded-2xl cursor-pointer transition-all group ${
                  activeConversation?.id === conv.id
                    ? 'bg-indigo-600/30 border border-indigo-500/40'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {conv.pinned && <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                      <p className="text-white text-xs font-medium truncate">{conv.title}</p>
                    </div>
                    {conv.messages[0] && (
                      <p className="text-white/35 text-[10px] truncate mt-0.5">
                        {conv.messages[0].content}
                      </p>
                    )}
                    <p className="text-white/20 text-[10px] mt-1">{formatDate(conv.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                    <button
                      onClick={(e) => toggleFavorite(conv, e)}
                      className={`p-1 rounded-lg transition-all ${conv.favorite ? 'text-yellow-400' : 'text-white/25 hover:text-white/60'} ${!conv.favorite && !isMobile ? 'opacity-0 group-hover:opacity-100' : ''}`}
                    >
                      <Star className="w-3 h-3" fill={conv.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className={`p-1 rounded-lg text-red-400/60 hover:text-red-300 transition-all ${!isMobile ? 'opacity-0 group-hover:opacity-100' : ''}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 p-3 flex items-center gap-2 flex-shrink-0 pb-safe-or-3" style={{ paddingBottom: `max(env(safe-area-inset-bottom, 0px), 12px)` }}>
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 flex items-center gap-2 text-white/50 hover:text-white text-xs py-2.5 px-3 rounded-xl hover:bg-white/8 transition-all"
        >
          <Settings className="w-3.5 h-3.5" /> Paramètres
        </button>
        <button
          onClick={deleteAllData}
          className="p-2.5 rounded-xl text-red-400/50 hover:text-red-300 hover:bg-red-500/10 transition-all"
          title="Supprimer toutes les données"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main GradieChat Component ───────────────────────────────────────────────

export default function GradieChat({ userId, schoolId, userRole, userName }: GradieChatProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [search, setSearch] = useState('');
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [stopRequested, setStopRequested] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  // ── Responsive ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window)
      window.speechSynthesis.cancel();
  }, []);

  // ── Scroll ──────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleScroll = useCallback(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const { scrollTop, scrollHeight, clientHeight } = c;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom && scrollHeight > clientHeight * 1.5);
  }, []);

  useEffect(() => {
    const c = messagesContainerRef.current;
    if (c) {
      c.addEventListener('scroll', handleScroll, { passive: true });
      return () => c.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (isAtBottom) scrollToBottom(true);
  }, [activeConversation?.messages, streamingContent, scrollToBottom, isAtBottom]);

  // ── Textarea auto-height ────────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async (q?: string) => {
    try {
      const params = new URLSearchParams({ userId });
      if (q?.trim()) params.set('search', q.trim());
      const res = await fetch(`/api/ai/conversations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load one conversation ───────────────────────────────────────────────────
  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/conversations/${id}?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveConversation(data.conversation);
        if (isMobile) setMobileSidebarOpen(false);
      }
    } catch { setError('Impossible de charger la conversation.'); }
    finally { setIsLoading(false); }
  }, [userId, isMobile]);

  // ── New conversation ────────────────────────────────────────────────────────
  const createNewConversation = async () => {
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        await loadConversations();
        await loadConversation(data.conversation.id);
        if (isMobile) setMobileSidebarOpen(false);
      }
    } catch { setError('Impossible de créer une conversation.'); }
  };

  // ── Favorite / Pin ──────────────────────────────────────────────────────────
  const toggleFavorite = async (conv: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations/${conv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, favorite: !conv.favorite }) });
      setConversations((p) => p.map((c) => c.id === conv.id ? { ...c, favorite: !conv.favorite } : c));
    } catch { }
  };

  const togglePin = async (conv: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations/${conv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, pinned: !conv.pinned }) });
      setConversations((p) => p.map((c) => c.id === conv.id ? { ...c, pinned: !conv.pinned } : c));
    } catch { }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations/${id}?userId=${userId}`, { method: 'DELETE' });
      if (activeConversation?.id === id) setActiveConversation(null);
      await loadConversations();
    } catch { }
  };

  const deleteAllData = async () => {
    if (!confirm('Supprimer TOUTES vos conversations ? Cette action est irréversible.')) return;
    try {
      await fetch(`/api/user/data?userId=${userId}`, { method: 'DELETE' });
      setActiveConversation(null);
      setConversations([]);
    } catch { }
  };

  // ── Send message ─────────────────────────────────────────────────────────────
  const sendMessage = async (override?: string) => {
    const msg = (override ?? input).trim();
    if (!msg || isStreaming) return;
    setInput('');
    setError(null);
    setStopRequested(false);

    let convId = activeConversation?.id;
    if (!convId) {
      const res = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
      if (res.ok) { const data = await res.json(); convId = data.conversation.id; await loadConversation(convId!); }
    }

    const userMsg: AiMessage = { id: Date.now().toString(), role: 'user', content: msg, createdAt: new Date().toISOString() };
    setActiveConversation((p) => p ? { ...p, messages: [...p.messages, userMsg] } : null);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, schoolId, userId, context: userRole === 'STUDENT' ? 'grades' : userRole === 'TEACHER' ? 'teacher' : userRole === 'ADMIN' ? 'admin' : undefined, conversationId: convId }),
      });

      if (!res.ok) {
        let m = 'Erreur du serveur.';
        try { const d = await res.json(); m = d.error || m; } catch { }
        setError(m);
        setIsStreaming(false);
        return;
      }

      if (!res.body || typeof res.body.getReader !== 'function') {
        const text = await res.text();
        const parsed = text ? JSON.parse(text) : null;
        const reply = parsed?.reply || parsed?.message || parsed?.response || text;
        const am: AiMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply || 'Désolé, je n\'ai pas pu générer de réponse.', createdAt: new Date().toISOString() };
        setActiveConversation((p) => p ? { ...p, messages: [...p.messages, am] } : null);
        setStreamingContent('');
        await loadConversations();
        return;
      }

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let acc = '';
      let finalConvId = convId;

      while (true) {
        if (stopRequested) { reader.cancel(); break; }
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data:'));
        for (const line of lines) {
          const json = line.replace(/^data:\s*/, '').trim();
          try {
            const p = JSON.parse(json);
            if (p.token) { acc += p.token; setStreamingContent(acc); }
            if (p.conversationId) finalConvId = p.conversationId;
            if (p.done) {
              const am: AiMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: acc, createdAt: new Date().toISOString() };
              setActiveConversation((p) => p ? { ...p, messages: [...p.messages, am] } : null);
              setStreamingContent('');
            }
          } catch { continue; }
        }
      }

      await loadConversations();
      if (finalConvId && finalConvId !== activeConversation?.id) await loadConversation(finalConvId);
    } catch { setError('Impossible de contacter Gradie. Vérifiez votre connexion.'); }
    finally { setIsStreaming(false); setStopRequested(false); readerRef.current = null; }
  };

  const stopGeneration = () => {
    setStopRequested(true);
    readerRef.current?.cancel().catch(() => {});
  };

  // ── Regenerate ──────────────────────────────────────────────────────────────
  const regenerateLast = async () => {
    if (isStreaming || !activeConversation) return;
    const msgs = activeConversation.messages;
    let targetIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'user') { targetIdx = i; break; } }
    if (targetIdx === -1) return;
    const userMsg = msgs[targetIdx];
    setActiveConversation((p) => p ? { ...p, messages: p.messages.slice(0, targetIdx + 1) } : null);
    sendMessage(userMsg.content);
  };

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) { setError(`Fichier trop volumineux (${formatSize(file.size)}). Limite : ${MAX_FILE_SIZE_MB} Mo.`); return; }

    let convId = activeConversation?.id;
    if (!convId) {
      const res = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
      if (res.ok) { const data = await res.json(); convId = data.conversation.id; }
    }

    setUploadProgress(0);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('conversationId', convId!);
    fd.append('userId', userId);

    try {
      setUploadProgress(30);
      const res = await fetch('/api/ai/upload', { method: 'POST', body: fd });
      setUploadProgress(80);
      if (res.ok) {
        setUploadProgress(100);
        setUploadSuccess(file.name);
        setTimeout(() => setUploadSuccess(null), 3000);
        await loadConversation(convId!);
        await loadConversations();
      } else {
        const err = await res.json();
        setError(err.error || 'Erreur upload.');
      }
    } catch { setError('Impossible d\'envoyer le fichier.'); }
    finally { setTimeout(() => setUploadProgress(null), 1200); }
  };

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const speakMessage = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/[*`#]/g, ''));
    utter.lang = 'fr-FR';
    utter.rate = 1.1;
    utter.onend = () => { setIsSpeaking(false); setSpeakingMsgId(null); };
    window.speechSynthesis.speak(utter);
    setIsSpeaking(true);
  };

  // ── Voice ────────────────────────────────────────────────────────────────────
  const startVoice = () => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setInput((p) => (p ? `${p} ${t}` : t));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportConversation = () => {
    if (!activeConversation) return;
    const lines = activeConversation.messages.map((m) =>
      m.role === 'user' ? `**Vous** : ${m.content}` : `**Gradie** : ${m.content}`
    );
    const body = `# ${activeConversation.title}\n\n${lines.join('\n\n')}`;
    const blob = new Blob([body], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Virtualizer ──────────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: activeConversation?.messages?.length ?? 0,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 100,
    overscan: 10,
  });

  // ── Welcome screen handlers ──────────────────────────────────────────────────
  const handleSelectWelcomePrompt = async (prompt: string) => {
    if (!activeConversation) await createNewConversation();
    setInput(prompt);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleSelectAssistant = async (name: string, prefix: string) => {
    if (!activeConversation) await createNewConversation();
    setInput(prefix + ' ');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const hasMessages = (activeConversation?.messages?.length ?? 0) > 0;
  const hasContent = input.trim().length > 0;

  return (
    <>
      {/* Global Styles */}
      <style>{`
        @keyframes gradi-typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes gradi-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradi-sheet-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes gradi-scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-gradi-fadein { animation: gradi-fadein 0.22s ease-out; }
        .animate-gradi-sheet-up { animation: gradi-sheet-up 0.32s cubic-bezier(0.32, 0.72, 0, 1); }
        .animate-gradi-scale-in { animation: gradi-scale-in 0.2s ease-out; }

        /* Bubble styles */
        .gradi-bubble-user {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          border-radius: 18px 18px 4px 18px;
          padding: 10px 14px;
          color: #fff;
          font-size: 15px;
          line-height: 1.55;
          max-width: min(75%, 460px);
          word-break: break-word;
          box-shadow: 0 2px 12px rgba(79, 70, 229, 0.25);
        }
        .gradi-bubble-ai {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px 18px 18px 4px;
          padding: 10px 14px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 15px;
          line-height: 1.6;
          max-width: min(80%, 520px);
          word-break: break-word;
          backdrop-filter: blur(8px);
        }
        @media (max-width: 480px) {
          .gradi-bubble-user { max-width: 86vw; font-size: 15px; }
          .gradi-bubble-ai   { max-width: 90vw; font-size: 15px; }
        }
        .gradi-msg-text { white-space: pre-wrap; }
        .gradi-msg-text strong { font-weight: 700; }
        .gradi-msg-text em { font-style: italic; opacity: 0.85; }
        .inline-code {
          background: rgba(255,255,255,0.12);
          padding: 1px 6px;
          border-radius: 5px;
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 13px;
        }

        /* Action buttons */
        .gradi-action-btn {
          padding: 4px 6px;
          border-radius: 8px;
          color: rgba(129,140,248,0.8);
          transition: all 0.15s;
          display: flex;
          align-items: center;
        }
        .gradi-action-btn:hover { background: rgba(129,140,248,0.1); color: #818CF8; }
        .gradi-action-btn:active { transform: scale(0.9); }

        /* Scrollbar */
        .gradi-scrollbar::-webkit-scrollbar { width: 4px; }
        .gradi-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .gradi-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .gradi-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }

        /* Mobile textarea 16px to prevent iOS zoom */
        @media (max-width: 768px) {
          .gradi-textarea { font-size: 16px !important; }
        }

        /* Top progress bar */
        @keyframes gradi-progress-slide {
          0% { left: -30%; width: 30%; }
          50% { left: 40%; width: 40%; }
          100% { left: 100%; width: 30%; }
        }
        .gradi-progress-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #6366F1, transparent);
          animation: gradi-progress-slide 1.4s ease-in-out infinite;
          z-index: 20;
        }
      `}</style>

      <div className="flex h-dvh bg-[#0A0A0F] rounded-xl overflow-hidden shadow-2xl relative select-none">
        {/* Upload Sheet */}
        {showUploadSheet && (
          <UploadActionSheet onClose={() => setShowUploadSheet(false)} onSelectFile={handleFileUpload} />
        )}

        {/* Mobile sidebar backdrop */}
        {isMobile && mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 z-40"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar — Desktop */}
        {!isMobile && (
          <aside
            className={`${sidebarOpen ? 'w-72 lg:w-80' : 'w-0'} flex-shrink-0 overflow-hidden transition-all duration-300`}
          >
            <Sidebar
              user={{ fullName: userName || 'Utilisateur', role: userRole || 'STUDENT' }}
              conversations={conversations}
              activeConversation={activeConversation}
              search={search}
              setSearch={setSearch}
              loadConversations={loadConversations}
              loadConversation={loadConversation}
              createNewConversation={createNewConversation}
              toggleFavorite={toggleFavorite}
              togglePin={togglePin}
              deleteConversation={deleteConversation}
              deleteAllData={deleteAllData}
              isMobile={false}
              setMobileSidebarOpen={setMobileSidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          </aside>
        )}

        {/* Sidebar — Mobile (slide from left) */}
        {isMobile && (
          <div
            className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 ease-out ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <Sidebar
              user={{ fullName: userName || 'Utilisateur', role: userRole || 'STUDENT' }}
              conversations={conversations}
              activeConversation={activeConversation}
              search={search}
              setSearch={setSearch}
              loadConversations={loadConversations}
              loadConversation={loadConversation}
              createNewConversation={createNewConversation}
              toggleFavorite={toggleFavorite}
              togglePin={togglePin}
              deleteConversation={deleteConversation}
              deleteAllData={deleteAllData}
              isMobile
              setMobileSidebarOpen={setMobileSidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          </div>
        )}

        {/* ── Main Area ── */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Top progress bar while streaming */}
          {isStreaming && <div className="gradi-progress-bar" />}

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 border-b border-white/5 bg-[#0D0D12]/80 backdrop-blur-sm flex-shrink-0 z-10"
            style={{ paddingTop: `max(env(safe-area-inset-top, 0px), 10px)`, paddingBottom: '10px' }}
          >
            {/* Sidebar toggle */}
            <button
              onClick={() =>
                isMobile ? setMobileSidebarOpen((p) => !p) : setSidebarOpen((p) => !p)
              }
              className="text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/8 transition-all shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {(isMobile && !mobileSidebarOpen) || (!isMobile && !sidebarOpen) ? (
                <MessageSquare className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>

            {/* Gradie avatar + title */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                  <Bot className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0D0D12]" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm sm:text-base truncate leading-tight">
                  {activeConversation ? activeConversation.title : 'Gradie'}
                </p>
                <p className="text-emerald-400 text-[10px] sm:text-xs">
                  {isStreaming ? '● Génération en cours…' : '● En ligne'}
                </p>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-1 shrink-0">
              {activeConversation && !isMobile && (
                <>
                  <button
                    onClick={exportConversation}
                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all"
                    title="Exporter en Markdown"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={regenerateLast}
                    disabled={isStreaming}
                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all disabled:opacity-30"
                    title="Régénérer la dernière réponse"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={createNewConversation}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/8 transition-all"
                title="Nouvelle conversation"
              >
                <Plus className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </button>
            </div>
          </header>

          {/* ── Messages area ───────────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <div
              ref={messagesContainerRef}
              className="h-full overflow-y-auto px-3 sm:px-6 py-4 gradi-scrollbar"
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* Loading spinner */}
              {isLoading && (
                <div className="flex items-center justify-center h-40">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Welcome screen */}
              {!activeConversation && !isLoading && (
                <GradieWelcome
                  userName={userName}
                  onSelectPrompt={handleSelectWelcomePrompt}
                  onSelectAssistant={handleSelectAssistant}
                />
              )}

              {/* Conversation welcome when no messages */}
              {activeConversation && !hasMessages && !isStreaming && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 animate-gradi-fadein">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-white font-bold text-lg mb-1">Nouvelle conversation</h2>
                  <p className="text-white/40 text-sm max-w-xs">Posez votre première question ou partagez un document.</p>
                </div>
              )}

              {/* Virtualized messages */}
              {activeConversation && hasMessages && (
                <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((vRow) => {
                    const msg = activeConversation.messages[vRow.index];
                    return (
                      <div
                        key={vRow.key}
                        data-index={vRow.index}
                        ref={virtualizer.measureElement}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vRow.start}px)` }}
                        className="pb-1"
                      >
                        <MessageItem
                          msg={msg}
                          idx={vRow.index}
                          total={activeConversation.messages.length}
                          isStreaming={isStreaming}
                          streamingContent={streamingContent}
                          isMobile={isMobile}
                          formatDate={formatDate}
                          speakMessage={(text) => { setSpeakingMsgId(msg.id); speakMessage(text); }}
                          isSpeaking={isSpeaking}
                          speakingMsgId={speakingMsgId}
                          onRegenerate={regenerateLast}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Streaming placeholder (first message in conv) */}
              {isStreaming && activeConversation && (activeConversation.messages.length === 0 || !streamingContent) && !streamingContent && (
                <TypingIndicator />
              )}

              {/* Streaming content standalone (before conversation loads) */}
              {isStreaming && streamingContent && (!activeConversation || activeConversation.messages.length === 0) && (
                <div className="flex items-end gap-2 mb-1 animate-gradi-fadein">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="gradi-bubble-ai">
                    <p className="text-[10px] font-semibold text-indigo-400 mb-0.5">Gradie</p>
                    <div className="gradi-msg-text" dangerouslySetInnerHTML={{ __html: renderMessage(streamingContent) }} />
                    <span className="inline-block w-[2px] h-[15px] bg-indigo-400 animate-pulse ml-0.5 align-middle rounded-full" />
                  </div>
                </div>
              )}

              {/* Stop button while streaming */}
              {isStreaming && (
                <div className="flex justify-center mt-3 animate-gradi-fadein">
                  <button
                    onClick={stopGeneration}
                    className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/12 text-white/70 hover:text-white px-4 py-2 rounded-full text-xs transition-all active:scale-95"
                  >
                    <StopCircle className="w-3.5 h-3.5 text-red-400" />
                    Arrêter la génération
                  </button>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="flex justify-center mt-3 animate-gradi-fadein">
                  <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-300 text-xs px-4 py-2.5 rounded-2xl max-w-sm">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => { setError(null); sendMessage(); }} className="ml-2 underline hover:no-underline whitespace-nowrap">Réessayer</button>
                  </div>
                </div>
              )}

              {/* Upload success */}
              {uploadSuccess && (
                <div className="flex justify-center mt-3 animate-gradi-fadein">
                  <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-2xl">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>« {uploadSuccess} » prêt pour analyse</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <button
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1C1C28]/90 backdrop-blur-md border border-white/10 text-white/70 hover:text-white px-4 py-2 rounded-full text-xs flex items-center gap-1.5 shadow-xl transition-all hover:bg-[#2C2C38] animate-gradi-fadein active:scale-95"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Revenir en bas
              </button>
            )}
          </div>

          {/* ── Documents bar ───────────────────────────────────────────────── */}
          {activeConversation && (activeConversation.documents?.length ?? 0) > 0 && (
            <div className="px-3 sm:px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto shrink-0 scrollbar-none bg-[#0D0D12]/60">
              {activeConversation.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 shrink-0">
                  <Paperclip className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="text-white/70 text-[11px] truncate max-w-[120px]">{doc.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Upload progress ─────────────────────────────────────────────── */}
          {uploadProgress !== null && (
            <div className="px-4 py-1.5 bg-[#0D0D12]/60 shrink-0">
              <div className="flex items-center gap-2 text-xs text-indigo-400">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="shrink-0">{uploadProgress}%</span>
              </div>
            </div>
          )}

          {/* ── Input Bar ───────────────────────────────────────────────────── */}
          <div
            className="shrink-0 bg-[#0D0D12]/80 backdrop-blur-sm border-t border-white/5 px-3 sm:px-4 pt-3"
            style={{ paddingBottom: `max(env(safe-area-inset-bottom, 0px), 12px)` }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-2">
                {/* Attach */}
                <button
                  onClick={() => setShowUploadSheet(true)}
                  disabled={isStreaming}
                  className="shrink-0 p-2.5 rounded-2xl text-white/40 hover:text-white hover:bg-white/8 transition-all disabled:opacity-30 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Joindre un fichier"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isStreaming ? 'Gradie répond…' : 'Écrivez un message…'}
                  disabled={isStreaming}
                  rows={1}
                  className="gradi-textarea flex-1 min-h-[44px] max-h-[120px] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 resize-none transition-all disabled:opacity-50 leading-relaxed"
                  style={{ fontSize: '15px', lineHeight: '1.5' }}
                />

                {/* Mic */}
                <button
                  type="button"
                  onClick={listening ? () => recognitionRef.current?.stop() : startVoice}
                  disabled={isStreaming}
                  className={`shrink-0 p-2.5 rounded-2xl transition-all disabled:opacity-30 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    listening ? 'bg-red-500 text-white animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/8'
                  }`}
                  title={listening ? 'Arrêter la dictée' : 'Dictée vocale'}
                >
                  {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Send / Stop */}
                <button
                  type="button"
                  onClick={isStreaming ? stopGeneration : () => sendMessage()}
                  disabled={!isStreaming && !hasContent}
                  className={`shrink-0 p-2.5 rounded-2xl transition-all active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center shadow-lg ${
                    isStreaming
                      ? 'bg-red-500/80 hover:bg-red-500 text-white shadow-red-500/20'
                      : hasContent
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30'
                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
                  title={isStreaming ? 'Arrêter' : 'Envoyer'}
                >
                  {isStreaming ? <StopCircle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                </button>
              </div>

              {/* Hint text */}
              {!isMobile && (
                <p className="text-center text-white/15 text-[10px] mt-2">
                  Entrée pour envoyer • Shift+Entrée pour nouvelle ligne
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}