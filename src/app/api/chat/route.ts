import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { VIVI_SYSTEM_PROMPT } from '@/lib/chat/system-prompt';
import { chatTools } from '@/lib/chat/tools';
import { executeToolCall } from '@/lib/chat/tool-executor';

const MAX_TOOL_ROUNDS = 5;
const MAX_MESSAGES = 40; // sliding window: 20 pairs

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  function send(data: Record<string, unknown>) {
    controller?.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  }

  function close() {
    try {
      controller?.close();
    } catch {
      // already closed
    }
  }

  return { stream, send, close };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  let body: { messages: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userMessages = (body.messages || []).slice(-MAX_MESSAGES);

  // Mock mode when no API key
  if (!apiKey || apiKey === 'sk-placeholder') {
    const { stream, send, close } = createSSEStream();

    setTimeout(() => {
      send({
        type: 'text_delta',
        text: '¡Hola! Soy Vivi, tu asistente de eventos. Ahora mismo estoy en modo demo, pero cuando esté completamente configurada podré ayudarte a buscar servicios, comparar precios y planear tu evento perfecto. 🎉',
      });
      send({ type: 'done' });
      close();
    }, 300);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  const anthropic = new Anthropic({ apiKey });
  const { stream, send, close } = createSSEStream();

  // Process in background — don't await
  (async () => {
    try {
      const claudeMessages: Anthropic.MessageParam[] = userMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      let toolRounds = 0;

      while (toolRounds <= MAX_TOOL_ROUNDS) {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: VIVI_SYSTEM_PROMPT,
          tools: chatTools,
          messages: claudeMessages,
        });

        // Collect text and tool_use blocks
        const textParts: string[] = [];
        const toolUseBlocks: Anthropic.ContentBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            textParts.push(block.text);
          } else if (block.type === 'tool_use') {
            toolUseBlocks.push(block);
          }
        }

        // If there are tool calls, execute them
        if (response.stop_reason === 'tool_use' && toolUseBlocks.length > 0) {
          toolRounds++;

          // Send any intermediate text
          if (textParts.length > 0) {
            send({ type: 'text_delta', text: textParts.join('') });
          }

          // Add assistant message with all content blocks
          claudeMessages.push({
            role: 'assistant',
            content: response.content,
          });

          // Execute each tool and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of toolUseBlocks) {
            if (block.type !== 'tool_use') continue;

            send({ type: 'tool_use', tool: block.name });

            try {
              const result = await executeToolCall(
                block.name,
                block.input as Record<string, unknown>
              );

              // Send service cards to client if present
              if (result.serviceCards && result.serviceCards.length > 0) {
                send({ type: 'service_cards', services: result.serviceCards });
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result.text,
              });
            } catch (err) {
              const errorMsg =
                err instanceof Error ? err.message : 'Error ejecutando herramienta';
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify({ error: errorMsg }),
                is_error: true,
              });
            }
          }

          // Add tool results as user message
          claudeMessages.push({
            role: 'user',
            content: toolResults,
          });

          // Continue the loop to get Claude's next response
          continue;
        }

        // Final text response — send it
        if (textParts.length > 0) {
          send({ type: 'text_delta', text: textParts.join('') });
        }

        break;
      }

      send({ type: 'done' });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Error procesando tu mensaje';
      console.error('[chat/route] Error:', errorMsg);
      send({ type: 'error', message: errorMsg });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
