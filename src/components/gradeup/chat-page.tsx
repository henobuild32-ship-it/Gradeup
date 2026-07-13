'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { MessageInfo, ConversationInfo, UserRole } from '@/lib/types';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search, MessageCircle, ArrowLeft, Users } from 'lucide-react';
import { subscribeToTable, isRealtimeEnabled } from '@/lib/realtime';

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Prof.',
  STUDENT: 'Élève',
  PARENT: 'Parent',
};

const roleBadgeColors: Record<string, string> = {
  ADMIN: 'bg-blue-100 text-blue-700',
  TEACHER: 'bg-emerald-100 text-emerald-700',
  STUDENT: 'bg-violet-100 text-violet-700',
  PARENT: 'bg-amber-100 text-amber-700',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

interface ContactInfo {
  id: string;
  fullName: string;
  role: string;
}

export default function ChatPage() {
  const { user } = useAppStore();
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [messages, setMessages] = useState<MessageInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const schoolId = user?.schoolId || '';
  const userId = user?.id || '';
  const userRole = user?.role || 'STUDENT';

  // Fetch contacts based on role
  const fetchContacts = useCallback(async () => {
    if (!schoolId) return;
    try {
      const allUsers: ContactInfo[] = [];

      // For ADMIN: show all other users
      if (userRole === 'ADMIN') {
        const res = await fetch(`/api/users?schoolId=${schoolId}`);
        const data = await res.json();
        if (data.users) {
          for (const u of data.users) {
            if (u.id !== userId) {
              allUsers.push({ id: u.id, fullName: u.fullName, role: u.role });
            }
          }
        }
      }

      // For TEACHER: show students, parents, other teachers, admin
      if (userRole === 'TEACHER') {
        const res = await fetch(`/api/users?schoolId=${schoolId}`);
        const data = await res.json();
        if (data.users) {
          for (const u of data.users) {
            if (u.id !== userId) {
              allUsers.push({ id: u.id, fullName: u.fullName, role: u.role });
            }
          }
        }
      }

      // For STUDENT: show teachers, parents (their own), admin
      if (userRole === 'STUDENT') {
        // Get teachers
        const teachersRes = await fetch(`/api/users?schoolId=${schoolId}&role=TEACHER`);
        const teachersData = await teachersRes.json();
        if (teachersData.users) {
          for (const u of teachersData.users) {
            allUsers.push({ id: u.id, fullName: u.fullName, role: u.role });
          }
        }
        // Get admin
        const adminRes = await fetch(`/api/users?schoolId=${schoolId}&role=ADMIN`);
        const adminData = await adminRes.json();
        if (adminData.users) {
          for (const u of adminData.users) {
            allUsers.push({ id: u.id, fullName: u.fullName, role: u.role });
          }
        }
        // Get own parents
        if (user?.parentId) {
          const parentRes = await fetch(`/api/users?schoolId=${schoolId}&role=PARENT`);
          const parentData = await parentRes.json();
          if (parentData.users) {
            for (const u of parentData.users) {
              if (u.id === user.parentId) {
                allUsers.push({ id: u.id, fullName: u.fullName, role: u.role });
              }
            }
          }
        }
      }

      // For PARENT: show teachers, admin
      if (userRole === 'PARENT') {
        // Get teachers
        const teachersRes = await fetch(`/api/users?schoolId=${schoolId}&role=TEACHER`);
        const teachersData = await teachersRes.json();
        if (teachersData.users) {
          for (const u of teachersData.users) {
            allUsers.push({ id: u.id, fullName: u.fullName, role: u.role });
          }
        }
        // Get admin
        const adminRes = await fetch(`/api/users?schoolId=${schoolId}&role=ADMIN`);
        const adminData = await adminRes.json();
        if (adminData.users) {
          for (const u of adminData.users) {
            allUsers.push({ id: u.id, fullName: u.fullName, role: u.role });
          }
        }
      }

      setContacts(allUsers);
    } catch {
      toast.error('Erreur lors du chargement des contacts');
    }
  }, [schoolId, userId, userRole, user?.parentId]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId || !schoolId) return;
    try {
      const res = await fetch(`/api/messages?userId=${userId}&schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // silently fail
    }
  }, [userId, schoolId]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (contactId: string) => {
    if (!userId || !schoolId || !contactId) return;
    try {
      const res = await fetch(
        `/api/messages/conversation?userId1=${userId}&userId2=${contactId}&schoolId=${schoolId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // silently fail
    }
  }, [userId, schoolId]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchContacts(), fetchConversations()]);
      setLoading(false);
    };
    init();
  }, [fetchContacts, fetchConversations]);

  // Real-time messages via Supabase Realtime (WebSockets), no custom server needed.
  // Falls back to a polling loop when Supabase is not configured.
  useEffect(() => {
    const handleChange = (payload: any) => {
      const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
      if (!row || row.schoolId !== schoolId) return;
      const involvesMe = row.senderId === userId || row.recipientId === userId;
      if (!involvesMe) return;
      // Refresh the open conversation (also marks received messages as read)
      // and the conversation list (unread badges / last message).
      fetchConversations();
      if (selectedContact && (row.senderId === selectedContact.id || row.recipientId === selectedContact.id)) {
        fetchMessages(selectedContact.id);
      }
    };

    const unsubscribe = subscribeToTable({
      table: 'Message',
      channelName: `realtime-messages-${schoolId}-${userId}`,
      onEvent: handleChange,
    });

    // Fallback / safety net polling (slower cadence when realtime is active).
    const pollMs = isRealtimeEnabled() ? 20000 : 4000;
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedContact) fetchMessages(selectedContact.id);
    }, pollMs);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchConversations, fetchMessages, selectedContact, schoolId, userId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Merge contacts with conversation data
  const getConversationData = (contact: ContactInfo): ConversationInfo | null => {
    return conversations.find((c) => c.partnerId === contact.id) || null;
  };

  // Sort contacts: those with conversations first, then alphabetically
  const sortedContacts = contacts
    .filter((c) =>
      searchQuery
        ? c.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const convA = getConversationData(a);
      const convB = getConversationData(b);
      // Contacts with conversations first
      if (convA && !convB) return -1;
      if (!convA && convB) return 1;
      if (convA && convB) {
        // Sort by last message time (newest first)
        return new Date(convB.lastMessageAt).getTime() - new Date(convA.lastMessageAt).getTime();
      }
      // Alphabetical
      return a.fullName.localeCompare(b.fullName);
    });

  const handleSelectContact = (contact: ContactInfo) => {
    setSelectedContact(contact);
    setMobileShowChat(true);
    fetchMessages(contact.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBackToList = () => {
    setMobileShowChat(false);
    setSelectedContact(null);
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: userId,
          recipientId: selectedContact.id,
          content: newMessage.trim(),
          schoolId,
        }),
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages(selectedContact.id);
        fetchConversations();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl px-5 py-3 text-white shadow-lg shadow-blue-500/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Messagerie</h1>
            <p className="text-sm text-blue-100">Communiquez avec votre communauté scolaire</p>
          </div>
        </div>
      </div>

      {/* Chat Container - prend tout l'espace restant */}
      <div className="flex-1 overflow-hidden border rounded-xl shadow-sm bg-card min-h-0">
        <div className="flex h-full">
          {/* Left Panel - Contact List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r flex flex-col shrink-0 bg-muted/30 ${
              mobileShowChat ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search */}
            <div className="p-3 border-b bg-card">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Contact List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="w-8 h-8 animate-pulse" />
                    <span className="text-sm">Chargement...</span>
                  </div>
                </div>
              ) : sortedContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? 'Aucun contact trouvé' : 'Aucun contact disponible'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {searchQuery
                      ? 'Essayez un autre terme de recherche'
                      : 'Les contacts apparaîtront ici'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {sortedContacts.map((contact) => {
                    const conv = getConversationData(contact);
                    const isSelected = selectedContact?.id === contact.id;

                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200
                          ${isSelected
                            ? 'bg-blue-50 border border-blue-200 shadow-sm'
                            : 'hover:bg-card border border-transparent hover:border-muted'
                          }
                        `}
                      >
                        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-muted">
                          <AvatarFallback
                            className={`text-xs font-semibold ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            }`}
                          >
                            {getInitials(contact.fullName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold truncate text-foreground">
                              {contact.fullName}
                            </span>
                            {conv && conv.unreadCount > 0 && (
                              <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 h-4 ${roleBadgeColors[contact.role] || 'bg-muted text-muted-foreground'}`}
                            >
                              {roleLabels[contact.role] || contact.role}
                            </Badge>
                            {conv && (
                              <span className="text-[11px] text-muted-foreground truncate">
                                {conv.lastMessage}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Chat Messages */}
          <div
            className={`flex-1 flex flex-col min-w-0 bg-background ${
              mobileShowChat ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b bg-card/80 backdrop-blur-sm shrink-0">
                  {/* Back button on mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 shrink-0"
                    onClick={handleBackToList}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-blue-100">
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      {getInitials(selectedContact.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold truncate text-foreground">
                      {selectedContact.fullName}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${roleBadgeColors[selectedContact.role] || 'bg-muted text-muted-foreground'}`}
                    >
                      {roleLabels[selectedContact.role] || selectedContact.role}
                    </Badge>
                  </div>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-3">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                          <MessageCircle className="w-8 h-8 text-blue-400" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Début de la conversation
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Envoyez le premier message à {selectedContact.fullName}
                        </p>
                      </div>
                    )}

                    {messages.map((msg, index) => {
                      const isSent = msg.senderId === userId;
                      const prevMsg = messages[index - 1];
                      const showDate =
                        !prevMsg ||
                        new Date(msg.createdAt).toDateString() !==
                          new Date(prevMsg.createdAt).toDateString();

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex items-center justify-center my-3">
                              <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                {new Date(msg.createdAt).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-fade-in`}
                          >
                            <div
                              className={`
                                max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl shadow-sm
                                ${isSent
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-md'
                                  : `bg-muted text-foreground rounded-bl-md ${!msg.read && !isSent ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`
                                }
                              `}
                            >
                              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                                {msg.content}
                              </p>
                              <div
                                className={`
                                  flex items-center gap-1 mt-1
                                  ${isSent ? 'justify-end' : 'justify-start'}
                                `}
                              >
                                <span
                                  className={`text-[10px] ${
                                    isSent ? 'text-blue-100' : 'text-muted-foreground/60'
                                  }`}
                                >
                                  {formatTime(msg.createdAt)}
                                </span>
                                {isSent && (
                                  <span className="text-[10px] text-blue-100">
                                    {msg.read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 border-t bg-card/80 backdrop-blur-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Écrire un message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 h-10 text-sm"
                      disabled={sending}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 shrink-0 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:brightness-110 active:scale-[0.95]"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State - No chat selected */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-5 shadow-sm">
                  <MessageCircle className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  Sélectionnez une conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  Choisissez un contact dans la liste pour commencer à échanger des messages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
