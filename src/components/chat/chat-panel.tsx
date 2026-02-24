'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { X, Send } from 'lucide-react';
import { useChat } from '@/providers/chat-provider';
import { ChatMessage } from './chat-message';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const { messages, isLoading, toggleChat, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl',
        // Desktop
        'bottom-24 right-6 h-[600px] w-[400px]',
        // Mobile: almost full screen
        'max-sm:inset-4 max-sm:bottom-4 max-sm:right-4 max-sm:h-auto max-sm:w-auto'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20 text-sm font-bold text-primary-foreground">
            V
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-foreground">Vivi</p>
            <p className="text-xs text-primary-foreground/70">Asistente de eventos</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChat}
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
            className="flex-1 rounded-full border bg-muted/50 px-4 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
