'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import type { ChatMessage, ChatServiceCard } from '@/types/chat';

interface ChatContextType {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  toggleChat: () => void;
  sendMessage: (text: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '¡Hola! Soy Vivi, tu asistente para planear eventos. Puedo ayudarte a buscar servicios, comparar precios y encontrar lo mejor para tu evento. ¿En qué te puedo ayudar?',
  timestamp: new Date().toISOString(),
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      // Add placeholder assistant message
      const assistantId = crypto.randomUUID();
      const placeholderMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isLoading: true,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, placeholderMsg]);
      setIsLoading(true);

      // Build messages for API (exclude welcome + placeholder)
      const apiMessages = [...messages.filter((m) => m.id !== 'welcome'), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No stream reader');

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        let accumulatedCards: ChatServiceCard[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'text_delta') {
                accumulatedText += event.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: accumulatedText,
                          isLoading: false,
                          serviceCards:
                            accumulatedCards.length > 0 ? accumulatedCards : undefined,
                        }
                      : m
                  )
                );
              } else if (event.type === 'service_cards') {
                accumulatedCards = [...accumulatedCards, ...event.services];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, serviceCards: accumulatedCards }
                      : m
                  )
                );
              } else if (event.type === 'tool_use') {
                // Show "searching" indicator
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: 'Buscando...', isLoading: true }
                      : m
                  )
                );
              } else if (event.type === 'error') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content:
                            'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
                          isLoading: false,
                        }
                      : m
                  )
                );
              } else if (event.type === 'done') {
                // Ensure loading is false
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, isLoading: false } : m
                  )
                );
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    'No pude conectarme al servidor. Verifica tu conexión e intenta de nuevo.',
                  isLoading: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  return (
    <ChatContext.Provider value={{ isOpen, messages, isLoading, toggleChat, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
