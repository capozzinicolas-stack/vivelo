'use client';

import { MessageCircle } from 'lucide-react';
import { useChat } from '@/providers/chat-provider';
import { ChatPanel } from './chat-panel';
import { cn } from '@/lib/utils';

export function ChatBubble() {
  const { isOpen, toggleChat } = useChat();

  return (
    <>
      {isOpen && <ChatPanel />}

      <button
        onClick={toggleChat}
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat con Vivi'}
        className={cn(
          'fixed bottom-20 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 lg:bottom-6',
          isOpen && 'max-sm:hidden'
        )}
      >
        {isOpen ? (
          <span className="text-lg font-bold">×</span>
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
