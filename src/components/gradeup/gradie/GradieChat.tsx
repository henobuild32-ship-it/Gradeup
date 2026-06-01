import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Plus, Send, Paperclip, Trash2, X, Menu, ChevronLeft } from 'lucide-react';

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
  // Rendu Markdown basique
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 rounded text-sm font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
              // Ajouter la réponse complète aux messages
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

  // ─── Rendu du sidebar ──────────────────────────────────────────────────────
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
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="text-white/60 hover:text-white p-1"
          >
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
                className="opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 rounded transition-all flex-shrink-0"
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
    <div className="flex h-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-xl overflow-hidden shadow-2xl relative">
      
      {/* ── Overlay mobile ────────────────────────────────────────────────── */}
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
            className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
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
          <div className="min-w-0">
            <p className="text-white font-semibold text-xs sm:text-sm truncate">Gradie</p>
            <p className="text-white/40 text-[10px] sm:text-xs hidden sm:block">IA · Axions Labs</p>
          </div>
          {activeConversation && (
            <div className="ml-auto flex items-center gap-2 min-w-0">
              <span className="text-white/30 text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-48">
                {activeConversation.title}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

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
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/25 text-sm"
              >
                <Plus className="w-4 h-4" />
                Commencer une conversation
              </button>
            </div>
          )}

          {activeConversation?.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white/10 backdrop-blur text-white/90 rounded-bl-sm border border-white/10'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                      <span className="text-white text-[7px] sm:text-[8px] font-bold">G</span>
                    </div>
                    <span className="text-white/50 text-[10px] sm:text-[11px] font-medium">Gradie</span>
                  </div>
                )}
                <div
                  className="text-[13px] sm:text-sm leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }}
                />
                <p className={`text-[9px] sm:text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200/60' : 'text-white/25'} text-right`}>
                  {formatDate(msg.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {/* Message en cours de streaming */}
          {isStreaming && streamingContent && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[90%] sm:max-w-[80%] bg-white/10 backdrop-blur text-white/90 rounded-2xl rounded-bl-sm border border-white/10 px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <span className="text-white text-[7px] sm:text-[8px] font-bold">G</span>
                  </div>
                  <span className="text-white/50 text-[10px] sm:text-[11px] font-medium">Gradie</span>
                  <span className="text-white/30 text-[9px] sm:text-[10px] animate-pulse ml-1">écrit…</span>
                </div>
                <div
                  className="text-[13px] sm:text-sm leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: renderMessage(streamingContent) }}
                />
                <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {/* Indicateur de chargement (sans contenu) */}
          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl rounded-bl-sm px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 text-red-300 text-xs px-4 py-2 rounded-xl">
                <X className="w-3 h-3 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Documents de la conversation */}
        {activeConversation?.documents && activeConversation.documents.length > 0 && (
          <div className="px-3 sm:px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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

        {/* Zone de saisie */}
        <div className="p-2.5 sm:p-4 border-t border-white/10 bg-black/20 backdrop-blur flex-shrink-0">
          <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:border-blue-500/50 transition-all">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-white/40 hover:text-blue-400 p-1 rounded-lg hover:bg-blue-500/10 transition-all flex-shrink-0 self-end"
              title="Joindre un fichier"
              disabled={isStreaming}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message… (Entrée pour envoyer)"
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-white placeholder-white/20 text-sm resize-none outline-none leading-relaxed max-h-32 overflow-y-auto"
              style={{ minHeight: '24px' }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-all hover:scale-105 active:scale-95 flex-shrink-0 self-end"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
          <p className="text-white/15 text-[9px] sm:text-[10px] text-center mt-2">
            Gradie peut faire des erreurs. Vérifiez les informations importantes. · Axions Labs
          </p>
        </div>
      </div>

      {/* Styles pour les scrollbars et animations */}
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}