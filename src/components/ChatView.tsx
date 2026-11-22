import React, { useEffect, useRef, useState } from 'react';
import { Bot, MapPin, Send, Users } from 'lucide-react';
import type { ChatChannel, ChatMessage, FriendProfile, UserProfile } from '../types';
import { AvatarRenderer } from './AvatarRenderer';

interface ChatViewProps {
  user: UserProfile;
  channels: ChatChannel[];
  messages: ChatMessage[];
  friends: FriendProfile[];
  onSendMessage: (channelId: string, text: string) => Promise<void>;
  onOpenPointOnMap: (pointId: string) => void;
}

const QUICK_PROMPTS = [
  'Onde descartar pilhas e baterias?',
  'Onde levar monitor ou TV antiga?',
  'Como trocar moedas por cupons?',
  'Como desbloquear novos avatares?',
];

export const ChatView: React.FC<ChatViewProps> = ({
  user,
  channels,
  messages,
  friends,
  onSendMessage,
  onOpenPointOnMap,
}) => {
  const [activeChannelId, setActiveChannelId] = useState<string>(channels[0]?.id || 'ch-assistant');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const channelMessages = messages.filter((m) => m.channelId === activeChannel.id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, activeChannelId]);

  const sendText = async (txt: string) => {
    const clean = txt.trim();
    if (!clean || sending) return;
    setSending(true);
    setInputText('');
    try {
      await onSendMessage(activeChannel.id, clean);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendText(inputText);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Chat Integrado EcoTech
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Tire dúvidas com o EcoBot sobre onde descartar cada eletrônico, converse com seu time de desafios e com seus amigos.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
        {/* Channels Sidebar */}
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 pb-1">
            Conversas & Assistente
          </p>
          {channels.map((ch) => {
            const active = ch.id === activeChannel.id;
            const friend = ch.friendId ? friends.find((f) => f.id === ch.friendId) : undefined;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannelId(ch.id)}
                className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {ch.type === 'assistant' ? (
                  <div className="w-11 h-11 rounded-2xl bg-[#0F9D58] text-white flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                ) : ch.type === 'team' ? (
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                ) : friend ? (
                  <AvatarRenderer config={friend.avatar} size={44} className="shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {ch.title}
                    </p>
                    {ch.unreadCount > 0 && (
                      <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        {ch.unreadCount} nova
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {ch.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Active Conversation Panel */}
        <div className="lg:col-span-8 flex flex-col h-[560px]">
          {/* Channel Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-slate-900 dark:text-white text-base">
                {activeChannel.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeChannel.subtitle}
              </p>
            </div>
            <AvatarRenderer config={user.avatar} size={38} />
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
            {channelMessages.map((msg) => {
              const isMe = msg.senderId === user.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 px-1">
                    {msg.senderName} ·{' '}
                    {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isMe
                        ? 'bg-[#0F9D58] text-white rounded-br-sm'
                        : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.suggestedPointId && (
                      <button
                        type="button"
                        onClick={() => onOpenPointOnMap(msg.suggestedPointId!)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Ver pontos em Palmas no Mapa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Quick Prompts for EcoBot */}
          {activeChannel.type === 'assistant' && (
            <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto bg-white dark:bg-slate-900">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendText(q)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Message Input */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 bg-white dark:bg-slate-900"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeChannel.type === 'assistant'
                  ? 'Digite qual item quer descartar (ex: celular, pilha, cabo)...'
                  : `Enviar mensagem para ${activeChannel.title}...`
              }
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              aria-label="Enviar mensagem"
              className="px-4 py-2.5 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white font-semibold text-sm inline-flex items-center gap-1.5 cursor-pointer min-h-[44px] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
