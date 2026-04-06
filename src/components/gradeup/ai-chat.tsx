'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Bot, User, Trash2, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';

interface AiChatProps {
  schoolId: string;
  userId: string;
  role: string;
}

export default function AiChat({ schoolId, userId, role }: AiChatProps) {
  const { chatMessages, addChatMessage, clearChatMessages } = useAppStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatKey = `ai-${role}-${userId}`;

  const messages = chatMessages[chatKey] || [];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    addChatMessage(chatKey, userMessage);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          userId,
          role,
          message: userMessage.content,
        }),
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearChatMessages(chatKey);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Bot className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Commencez une conversation</p>
                <p className="text-sm mt-1">
                  Posez vos questions sur la gestion de votre établissement
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div
                    className={`text-[10px] mt-1.5 ${
                      msg.role === 'user' ? 'text-blue-200' : 'text-muted-foreground'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-1">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-2 w-2 rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-red-500"
              onClick={handleClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Input
            ref={inputRef}
            placeholder="Écrivez votre message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="flex-1"
          />
          <Button
            className="bg-blue-600 hover:bg-blue-700 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
