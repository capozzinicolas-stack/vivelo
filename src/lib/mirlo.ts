/**
 * Mirlo API Client — WhatsApp Business messaging via Mirlo
 * Pattern: same as stripe.ts (conditional init + mock mode)
 */

const MIRLO_API_KEY = process.env.MIRLO_API_KEY?.trim();
const MIRLO_ORGANIZATION_ID = process.env.MIRLO_ORGANIZATION_ID?.trim();
const MIRLO_ORGANIZATION_ADDRESS = process.env.MIRLO_ORGANIZATION_ADDRESS?.trim();

export const isMockMirlo = !MIRLO_API_KEY || MIRLO_API_KEY === 'mirlo_placeholder';

const BASE_URL = 'https://api.mirlo.com/v1';

// ─── Internal fetch helper ────────────────────────────────────

async function mirloFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'X-API-Key': MIRLO_API_KEY!,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`[Mirlo] ${method} ${path} failed (${res.status}): ${errorText}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────

export interface MirloTemplateParameter {
  type: 'text';
  parameter_name: string;
  text: string;
}

export interface MirloTemplateComponent {
  type: 'body' | 'header';
  parameters: MirloTemplateParameter[];
}

export interface MirloSendTemplateResponse {
  id: string;
  conversation_id: string;
  external_id?: string;
  status: Record<string, string>;
  template_name?: string;
}

export interface MirloMessageResponse {
  id: string;
  conversation_id?: string;
  external_id?: string;
  status: Record<string, string>;
  content?: unknown;
  timestamp?: string;
}

export interface MirloTemplate {
  name: string;
  id: string;
  status: string;
  category: string;
  language: string;
  parameter_format?: string;
  components?: Array<{
    type: string;
    format?: string;
    text?: string;
  }>;
}


// ─── API Functions ────────────────────────────────────────────

/**
 * Send a template message to a single recipient.
 * This is the primary endpoint for transactional WhatsApp notifications.
 */
export async function mirloSendTemplate(
  to: string,
  metaTemplateId: string,
  components?: MirloTemplateComponent[],
): Promise<MirloSendTemplateResponse> {
  if (isMockMirlo) {
    console.log(`[Mirlo Mock] sendTemplate to=${to}, template=${metaTemplateId}`);
    return {
      id: `mock-msg-${Date.now()}`,
      conversation_id: `mock-conv-${Date.now()}`,
      status: { pending: new Date().toISOString() },
    };
  }

  return mirloFetch<MirloSendTemplateResponse>('/messages/send-template', {
    method: 'POST',
    body: {
      organization_id: MIRLO_ORGANIZATION_ID,
      organization_address: MIRLO_ORGANIZATION_ADDRESS,
      to,
      meta_template_id: metaTemplateId,
      do_not_pause: true,
      ...(components && components.length > 0 ? { components } : {}),
    },
  });
}

// ─── Template Name → ID Cache ────────────────────────────────

let templateCache: Map<string, string> | null = null;

/**
 * Resolve template name to meta_template_id via Mirlo API.
 * Caches the mapping per serverless cold start.
 */
export async function getTemplateIdByName(name: string): Promise<string | null> {
  if (isMockMirlo) return `mock-template-${name}`;
  if (!templateCache) {
    const { data } = await mirloListTemplates();
    templateCache = new Map(
      data.filter(t => t.status === 'APPROVED').map(t => [t.name, t.id]),
    );
  }
  return templateCache.get(name) ?? null;
}

export function clearTemplateCache() {
  templateCache = null;
}

/**
 * List templates from Meta (via Mirlo).
 */
export async function mirloListTemplates(): Promise<{ data: MirloTemplate[] }> {
  if (isMockMirlo) {
    console.log('[Mirlo Mock] listTemplates');
    return { data: [] };
  }

  return mirloFetch<{ data: MirloTemplate[] }>(
    `/whatsapp-management/templates?organization_id=${MIRLO_ORGANIZATION_ID}&organization_address=${MIRLO_ORGANIZATION_ADDRESS}`,
  );
}

/**
 * Get a single message by ID (for status tracking).
 */
export async function mirloGetMessage(messageId: string): Promise<MirloMessageResponse> {
  if (isMockMirlo) {
    return {
      id: messageId,
      status: { pending: new Date().toISOString(), delivered: new Date().toISOString() },
    };
  }

  return mirloFetch<MirloMessageResponse>(`/messages/${messageId}`);
}
