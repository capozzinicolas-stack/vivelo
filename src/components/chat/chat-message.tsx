'use client';

import { Loader2 } from 'lucide-react';
import type { ChatMessage as MessageType } from '@/types/chat';
import { ChatServiceCard } from './chat-service-card';
import { cn } from '@/lib/utils';

export function ChatMessage({ message }: { message: MessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[85%] space-y-2">
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          {message.isLoading && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Pensando...</span>
            </div>
          ) : message.isLoading && message.content === 'Buscando...' ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Buscando servicios...</span>
            </div>
          ) : (
            message.content.split('\n').map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))
          )}
        </div>

        {message.serviceCards && message.serviceCards.length > 0 && (
          <div className="space-y-2">
            {message.serviceCards.map((service) => (
              <ChatServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
