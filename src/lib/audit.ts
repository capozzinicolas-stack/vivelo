import { createAdminSupabaseClient } from '@/lib/supabase/admin';

interface AuditLogEntry {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}

/**
 * Fire-and-forget admin audit logging.
 * Never throws — failures are logged to console only.
 */
export function logAdminAction(entry: AuditLogEntry): void {
  const supabase = createAdminSupabaseClient();
  supabase
    .from('admin_audit_log')
    .insert({
      admin_id: entry.adminId,
      action: entry.action,
      target_type: entry.targetType || null,
      target_id: entry.targetId || null,
      details: entry.details || {},
      ip_address: entry.ip || null,
    })
    .then(({ error }) => {
      if (error) console.error('[Audit] Failed to log action:', error.message);
    });
}
