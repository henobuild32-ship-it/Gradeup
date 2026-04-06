'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Bot, User, Trash2, Loader2, Sparkles, MessageSquare, Lightbulb, GraduationCap, BookOpen } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

interface AiChatProps {
  schoolId: string;
  userId: string;
  role: string;
}

const suggestedPrompts = [
  { icon: BookOpen, text: 'Comment améliorer la moyenne de mes élèves ?', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { icon: Lightbulb, text: 'Donne-moi des conseils pédagogiques', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { icon: GraduationCap, text: 'Quels sont les élèves en difficulté ?', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  { icon: Sparkles, text: 'Aide-moi à préparer un cours', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
];

export default function AiChat({ schoolId, userId, role }: AiChatProps) {
  const { chatMessages, addChatMessage, clearChatMessages } = useAppStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatKey = `ai-${role}-${userId}`;
  const messages = chatMessages[chatKey] || [];

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }
  };

  const handleSend = async (customMessage?: string) => {
    const messageContent = customMessage || input.trim();
    if (!messageContent || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    addChatMessage(chatKey, userMessage);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, userId, role, message: userMessage.content }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || data.response || 'Désolé, une erreur est survenue.',
        timestamp: new Date().toISOString(),
      };

      addChatMessage(chatKey, assistantMessage);
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer.',
        timestamp: new Date().toISOString(),
      };
      addChatMessage(chatKey, errorMessage);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = () => { clearChatMessages(chatKey); };

  return (
    <Card className="flex flex-col h-[600px] shadow-lg border-blue-100 transition-all duration-300 hover:shadow-xl hover:border-blue-200 rounded-2xl relative overflow-hidden">
      {/* Gradient thinking indicator at top when AI is loading */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 animate-gradient-bg z-20" />
      )}

      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center gap-3 rounded-t-lg">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">IA Gradie</p>
          <p className="text-xs text-blue-200 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            En ligne — prêt à vous aider
          </p>
        </div>
      </div>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4 shadow-sm">
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-lg font-semibold mb-1">Commencez une conversation</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Posez vos questions sur la gestion de votre établissement
                </p>
                {/* Suggested Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(prompt.text)}
                      className="flex items-center gap-2.5 p-3.5 rounded-xl text-left text-sm font-medium border border-blue-100 bg-white hover:bg-blue-50 hover:shadow-md hover:border-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all text-blue-700"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 shrink-0">
                        <prompt.icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <span>{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white mt-1 shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md'
                      : 'bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-bl-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-muted-foreground'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white mt-1 shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white mt-1 shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-muted-foreground ml-1">Gradie réfléchit...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <div className="border-t bg-gradient-to-r from-slate-50 to-white p-4">
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="relative flex-1">
            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              ref={inputRef}
              placeholder="Écrivez votre message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="pl-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <Button
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shrink-0 hover:scale-[1.05] hover:brightness-110 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-blue-500/20"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            size="icon"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
