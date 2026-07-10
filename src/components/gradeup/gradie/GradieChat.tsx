import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Send, Paperclip, Trash2, X, Menu, ChevronLeft, FileText, Image, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
    .replace(/`(.*?)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 rounded text-sm font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
}

// ─── iOS Typing Indicator ─────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-ios-fade-in">
      <div className="flex items-end gap-1.5">
        {/* Avatar Gradie */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5">
          <span className="text-white text-[9px] font-bold">G</span>
        </div>
        {/* Bubble avec 3 points style iMessage */}
        <div className="bg-[#E9E9EB] dark:bg-white/15 rounded-[18px] rounded-bl-[4px] px-4 py-3 shadow-sm">
          <div className="flex gap-[5px] items-center h-4">
            <span
              className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-white/40"
              style={{ animation: 'iosTypingDot 1.2s ease-in-out infinite', animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-white/40"
              style={{ animation: 'iosTypingDot 1.2s ease-in-out infinite', animationDelay: '200ms' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-white/40"
              style={{ animation: 'iosTypingDot 1.2s ease-in-out infinite', animationDelay: '400ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Action Sheet (style iOS) ─────────────────────────────────────────

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-ios-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-ios-sheet-up">
        <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[16px] overflow-hidden shadow-2xl max-w-lg mx-auto">
          {/* En-tête */}
          <div className="px-4 pt-4 pb-3 border-b border-black/10 dark:border-white/10">
            <div className="w-9 h-1 rounded-full bg-black/20 dark:bg-white/20 mx-auto mb-3" />
            <h3 className="text-[15px] font-semibold text-center text-black dark:text-white">
              Joindre un fichier
            </h3>
            <p className="text-[12px] text-[#8E8E93] text-center mt-0.5">
              Limite : {MAX_FILE_SIZE_MB} Mo par fichier
            </p>
          </div>

          {/* Zone de dépôt */}
          <div className="p-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-[12px] p-6 text-center cursor-pointer transition-all
                ${dragOver
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-black/15 dark:border-white/15 hover:border-blue-400 hover:bg-blue-500/5'
                }
              `}
            >
              <Paperclip className="w-8 h-8 text-[#8E8E93] mx-auto mb-2" />
              <p className="text-[14px] font-medium text-black dark:text-white">
                Appuyez ou glissez-déposez
              </p>
              <p className="text-[12px] text-[#8E8E93] mt-1">
                PDF, Word, Texte, Images
              </p>
            </div>

            {/* Types acceptés */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'PDF', icon: <FileText className="w-4 h-4 text-red-500" />, ext: '.pdf' },
                { label: 'Word', icon: <FileText className="w-4 h-4 text-blue-500" />, ext: '.docx' },
                { label: 'Texte', icon: <FileText className="w-4 h-4 text-gray-500" />, ext: '.txt' },
                { label: 'JPEG', icon: <Image className="w-4 h-4 text-orange-500" />, ext: '.jpg' },
                { label: 'PNG', icon: <Image className="w-4 h-4 text-purple-500" />, ext: '.png' },
                { label: 'WebP', icon: <Image className="w-4 h-4 text-green-500" />, ext: '.webp' },
              ].map((t) => (
                <div
                  key={t.ext}
                  className="flex items-center gap-1.5 bg-white dark:bg-white/5 rounded-[8px] px-2.5 py-2 border border-black/8 dark:border-white/8"
                >
                  {t.icon}
                  <span className="text-[11px] font-medium text-black dark:text-white">{t.label}</span>
                </div>
              ))}
            </div>

            {/* Avertissement taille */}
            <div className="flex items-start gap-2 mt-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-[10px] px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                  Limite de {MAX_FILE_SIZE_MB} Mo
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-500/80 mt-0.5">
                  Les fichiers dépassant cette limite seront refusés pour garantir des performances optimales.
                </p>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-start gap-2 mt-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-[10px] px-3 py-2.5">
                <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Bouton annuler */}
          <div className="px-4 pb-safe pb-4">
            <button
              onClick={onClose}
              className="w-full bg-white dark:bg-white/10 rounded-[12px] py-[14px] text-[17px] font-semibold text-[#007AFF] active:opacity-70 transition-opacity"
            >
              Annuler
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function GradieChat({ userId, schoolId, userRole, userName }: GradieChatProps) {
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ─── Détection mobile ───────────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
        setMobileSidebarOpen(false);
      } else {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ─── Scroll automatique ───────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamingContent, scrollToBottom]);

  // ─── Ajustement auto de la hauteur du textarea ──────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  // ─── Chargement de la liste des conversations ──────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/conversations?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch { /* silencieux */ }
  }, [userId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ─── Chargement d'une conversation ────────────────────────────────────────
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
    } catch {
      setError('Impossible de charger la conversation.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isMobile]);

  // ─── Nouveau chat ─────────────────────────────────────────────────────────
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
    } catch {
      setError('Impossible de créer une nouvelle conversation.');
    }
  };

  // ─── Supprimer une conversation ───────────────────────────────────────────
  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations/${id}?userId=${userId}`, { method: 'DELETE' });
      if (activeConversation?.id === id) setActiveConversation(null);
      await loadConversations();
    } catch { /* silencieux */ }
  };

  // ─── Envoi d'un message avec streaming ────────────────────────────────────
  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || isStreaming) return;

    setInput('');
    setError(null);

    // Créer la conversation si nécessaire
    let convId = activeConversation?.id;
    if (!convId) {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        convId = data.conversation.id;
        await loadConversation(convId!);
      }
    }

    // Ajouter le message utilisateur localement
    const userMsg: AiMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setActiveConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, userMsg] } : null
    );

    setIsStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          schoolId,
          userId,
          context: userRole === 'STUDENT' ? 'grades' : userRole === 'TEACHER' ? 'teacher' : userRole === 'ADMIN' ? 'admin' : undefined,
          conversationId: convId,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        setError(err.error || 'Erreur du serveur.');
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let finalConvId = convId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data:'));
        for (const line of lines) {
          const json = line.replace(/^data:\s*/, '').trim();
          try {
            const parsed = JSON.parse(json);
            if (parsed.token) {
              accumulated += parsed.token;
              setStreamingContent(accumulated);
            }
            if (parsed.conversationId) finalConvId = parsed.conversationId;
            if (parsed.done) {
              const assistantMsg: AiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: accumulated,
                createdAt: new Date().toISOString(),
              };
              setActiveConversation((prev) =>
                prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : null
              );
              setStreamingContent('');
            }
          } catch { /* token invalide */ }
        }
      }

      await loadConversations();
      if (finalConvId && finalConvId !== activeConversation?.id) {
        await loadConversation(finalConvId);
      }
    } catch {
      setError('Impossible de contacter Gradie. Vérifiez votre connexion.');
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── Upload de fichier ─────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Vérification taille côté client
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`Fichier trop volumineux (${formatSize(file.size)}). Limite : ${MAX_FILE_SIZE_MB} Mo.`);
      return;
    }

    let convId = activeConversation?.id;
    if (!convId) {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        convId = data.conversation.id;
      }
    }

    setUploadProgress(0);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', convId!);
    formData.append('userId', userId);

    try {
      setUploadProgress(30);
      const res = await fetch('/api/ai/upload', { method: 'POST', body: formData });
      setUploadProgress(80);
      if (res.ok) {
        setUploadProgress(100);
        setUploadSuccess(file.name);
        setTimeout(() => setUploadSuccess(null), 3000);
        await loadConversation(convId!);
        await loadConversations();
      } else {
        const err = await res.json();
        setError(err.error || 'Erreur lors de l\'upload.');
      }
    } catch {
      setError('Impossible d\'envoyer le fichier.');
    } finally {
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  // ─── Supprimer toutes les données (RGPD) ──────────────────────────────────
  const deleteAllData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES vos conversations Gradie ? Cette action est irréversible.')) return;
    try {
      await fetch(`/api/user/data?userId=${userId}`, { method: 'DELETE' });
      setActiveConversation(null);
      setConversations([]);
    } catch { /* silencieux */ }
  };

  // ─── Gestion du clavier ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Sidebar ──────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <div className="h-full flex flex-col bg-black/30 backdrop-blur-xl border-r border-white/10">
      <div className="p-3 sm:p-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-wide hidden sm:inline">Gradie</span>
        </div>
        {isMobile && (
          <button onClick={() => setMobileSidebarOpen(false)} className="text-white/60 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={createNewConversation}
          className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau
        </button>
      </div>

      {isMobile && (
        <div className="p-3 border-b border-white/10">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2.5 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Nouvelle conversation
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <div className="text-center text-white/30 text-xs mt-8 px-4">
            Aucune conversation.<br />Commencez à parler avec Gradie !
          </div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => loadConversation(conv.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadConversation(conv.id); }}
            role="button"
            tabIndex={0}
            className={`w-full text-left p-3 rounded-xl transition-all group cursor-pointer ${
              activeConversation?.id === conv.id
                ? 'bg-blue-600/40 border border-blue-500/50'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{conv.title}</p>
                {conv.messages[0] && (
                  <p className="text-white/40 text-[11px] truncate mt-0.5">
                    {conv.messages[0].content}
                  </p>
                )}
                <p className="text-white/25 text-[10px] mt-1">{formatDate(conv.updatedAt)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id, e); }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 rounded transition-all flex-shrink-0"
                style={{ opacity: isMobile ? 1 : undefined }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <button
          onClick={deleteAllData}
          className="w-full flex items-center gap-2 text-red-400/70 hover:text-red-300 text-xs py-2 px-3 rounded-lg hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-3 h-3" />
          Supprimer toutes mes données
        </button>
      </div>
    </div>
  );

  // ─── Rendu principal ───────────────────────────────────────────────────────
  return (
    <>
      {/* Styles globaux pour animations iOS */}
      <style>{`
        @keyframes iosTypingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes iosFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes iosSheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-ios-fade-in {
          animation: iosFadeIn 0.25s ease-out;
        }
        .animate-ios-sheet-up {
          animation: iosSheetUp 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .scrollbar-gradie::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-gradie::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-gradie::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 9999px; }
        .scrollbar-gradie::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        /* Masque le caret iMessage sur mobile en bas */
        .imessage-user-bubble { border-radius: 18px 18px 4px 18px; }
        .imessage-ai-bubble { border-radius: 18px 18px 18px 4px; }
      `}</style>

      <div className="flex h-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-xl overflow-hidden shadow-2xl relative">

        {/* ── Upload Action Sheet ──────────────────────────────────────────── */}
        {showUploadSheet && (
          <UploadActionSheet
            onClose={() => setShowUploadSheet(false)}
            onSelectFile={handleFileUpload}
          />
        )}

        {/* ── Overlay mobile sidebar ───────────────────────────────────────── */}
        {isMobile && mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar desktop ───────────────────────────────────────────────── */}
        {!isMobile && (
          <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 flex-shrink-0 overflow-hidden`}>
            {renderSidebar()}
          </aside>
        )}

        {/* ── Sidebar mobile ────────────────────────────────────────────────── */}
        {isMobile && (
          <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 transform transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {renderSidebar()}
          </div>
        )}

        {/* ── Zone principale ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 h-full">

          {/* En-tête */}
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/10 bg-black/20 backdrop-blur flex-shrink-0">
            <button
              onClick={() => isMobile ? setMobileSidebarOpen(true) : setSidebarOpen(!sidebarOpen)}
              className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {isMobile && !mobileSidebarOpen ? (
                <Menu className="w-5 h-5" />
              ) : !isMobile && !sidebarOpen ? (
                <Menu className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5 hidden sm:block" />
              )}
              {isMobile && <Menu className="w-5 h-5 sm:hidden" />}
            </button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] sm:text-xs font-bold">G</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-xs sm:text-sm truncate">Gradie</p>
              <div className="flex items-center gap-1.5">
                {/* Point vert "en ligne" style iMessage */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <p className="text-white/40 text-[10px] sm:text-xs">En ligne</p>
              </div>
            </div>
            {activeConversation && (
              <div className="flex items-center gap-2 min-w-0 ml-auto">
                <span className="text-white/30 text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-48">
                  {activeConversation.title}
                </span>
              </div>
            )}
          </div>

          {/* ── Messages ────────────────────────────────────────────────────── */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-2 scrollbar-gradie"
          >
            {/* Chargement */}
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Écran d'accueil vide */}
            {!activeConversation && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 sm:gap-6 px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <span className="text-white text-3xl sm:text-4xl font-bold">G</span>
                </div>
                <div>
                  <h2 className="text-white text-lg sm:text-xl font-bold mb-2">
                    Bonjour{userName ? `, ${userName}` : ''} !
                  </h2>
                  <p className="text-white/50 text-xs sm:text-sm max-w-sm">
                    Je suis Gradie, votre assistante IA scolaire.<br />
                    Posez-moi une question ou partagez un document.
                  </p>
                </div>
                <button
                  onClick={createNewConversation}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/25 text-sm min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  Commencer une conversation
                </button>
              </div>
            )}

            {/* Messages existants */}
            {activeConversation?.messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const showTimestamp = idx === activeConversation.messages.length - 1 ||
                (new Date(activeConversation.messages[idx + 1]?.createdAt).getTime() -
                  new Date(msg.createdAt).getTime() > 5 * 60 * 1000);

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-ios-fade-in`}>
                  <div className={`flex items-end gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar Gradie (IA seulement) */}
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 self-end">
                        <span className="text-white text-[9px] font-bold">G</span>
                      </div>
                    )}

                    {/* Bulle message style iMessage */}
                    <div
                      className={`max-w-[82%] sm:max-w-[75%] px-[14px] py-[9px] shadow-sm ${
                        isUser
                          ? 'bg-[#007AFF] text-white imessage-user-bubble'
                          : 'bg-[#E9E9EB] dark:bg-white/15 text-black dark:text-white/90 imessage-ai-bubble'
                      }`}
                    >
                      {!isUser && (
                        <p className="text-[10px] font-semibold text-[#007AFF] dark:text-blue-400 mb-1">Gradie</p>
                      )}
                      <div
                        className="text-[14px] sm:text-[15px] leading-[1.4] break-words"
                        dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }}
                      />
                    </div>
                  </div>

                  {/* Horodatage discret sous la bulle (affiché uniquement sur dernier message ou gap > 5 min) */}
                  {showTimestamp && (
                    <p className={`text-[10px] text-white/25 mt-1 ${isUser ? 'mr-2' : 'ml-8'}`}>
                      {formatDate(msg.createdAt)}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Message en cours de streaming */}
            {isStreaming && streamingContent && (
              <div className="flex flex-col items-start animate-ios-fade-in">
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 self-end">
                    <span className="text-white text-[9px] font-bold">G</span>
                  </div>
                  <div className="max-w-[82%] sm:max-w-[75%] bg-[#E9E9EB] dark:bg-white/15 imessage-ai-bubble px-[14px] py-[9px] shadow-sm">
                    <p className="text-[10px] font-semibold text-[#007AFF] dark:text-blue-400 mb-1">Gradie</p>
                    <div
                      className="text-[14px] sm:text-[15px] leading-[1.4] break-words text-black dark:text-white/90"
                      dangerouslySetInnerHTML={{ __html: renderMessage(streamingContent) }}
                    />
                    {/* Curseur clignotant */}
                    <span className="inline-block w-[2px] h-[14px] bg-[#007AFF] animate-pulse ml-0.5 align-middle rounded-full" />
                  </div>
                </div>
              </div>
            )}

            {/* Indicateur de frappe 3 points iMessage (avant que le streaming commence) */}
            {isStreaming && !streamingContent && <TypingIndicator />}

            {/* Erreur */}
            {error && (
              <div className="flex justify-center animate-ios-fade-in">
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 text-xs px-4 py-2 rounded-xl">
                  <X className="w-3 h-3 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Notification succès upload */}
            {uploadSuccess && (
              <div className="flex justify-center animate-ios-fade-in">
                <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2 rounded-xl">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span>« {uploadSuccess} » envoyé avec succès</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Documents de la conversation */}
          {activeConversation?.documents && activeConversation.documents.length > 0 && (
            <div className="px-3 sm:px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-gradie">
              {activeConversation.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 sm:px-3 py-1.5 flex-shrink-0">
                  <Paperclip className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span className="text-white/70 text-[11px] sm:text-xs truncate max-w-[100px] sm:max-w-32">{doc.name}</span>
                  <span className="text-white/30 text-[9px] sm:text-[10px] flex-shrink-0">{formatSize(doc.size)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Barre de progression d'upload */}
          {uploadProgress !== null && (
            <div className="px-3 sm:px-4 py-2 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/10 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-white/50 text-[10px] sm:text-xs">{uploadProgress}%</span>
              </div>
            </div>
          )}

          {/* ── Zone de saisie style iMessage ────────────────────────────────── */}
          <div className="px-2.5 sm:px-4 pt-2 pb-3 sm:pb-4 border-t border-white/10 bg-black/20 backdrop-blur flex-shrink-0">
            <div className="flex items-end gap-2">
              {/* Bouton joindre → ouvre l'Action Sheet */}
              <button
                onClick={() => setShowUploadSheet(true)}
                disabled={isStreaming}
                className="text-white/50 hover:text-blue-400 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-blue-500/10 transition-all flex-shrink-0 disabled:opacity-30"
                title="Joindre un fichier (max 20 Mo)"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Champ de saisie */}
              <div className="flex-1 bg-white/5 border border-white/10 rounded-[22px] px-4 py-2.5 focus-within:border-blue-500/50 transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message…"
                  rows={1}
                  disabled={isStreaming}
                  className="w-full bg-transparent text-white placeholder-white/20 text-[15px] resize-none outline-none leading-relaxed max-h-32 overflow-y-auto"
                  style={{ minHeight: '24px' }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                  }}
                />
              </div>

              {/* Bouton envoyer — style iMessage (bleu quand actif, gris sinon) */}
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
                  input.trim() && !isStreaming
                    ? 'bg-[#007AFF] hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-500/30'
                    : 'bg-white/10 opacity-40 cursor-not-allowed'
                }`}
              >
                {isStreaming ? (
                  <div className="flex gap-[3px] items-center">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-white"
                        style={{ animation: 'iosTypingDot 1.2s ease-in-out infinite', animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Mention limite + disclaimer — sous la barre */}
            <p className="text-white/15 text-[10px] text-center mt-2 px-2">
              Fichiers max <span className="text-white/25 font-medium">{MAX_FILE_SIZE_MB} Mo</span> · Gradie peut faire des erreurs — vérifiez les informations importantes
            </p>
          </div>
        </div>
      </div>
    </>
  );
}