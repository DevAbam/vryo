import "server-only";
import type { Json } from "@/types/database";
import { logger } from "@/lib/observability/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuditEvent = {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, Json>;
  requestId?: string;
};

/**
 * Appends a security audit record. Call only after the action has been authorized
 * and committed. Never include secrets, tokens or private message content.
 */
export async function recordAudit(event: AuditEvent): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("audit_log")
    .insert({
      actor_id: event.actorId,
      action: event.action,
      target_type: event.targetType ?? null,
      target_id: event.targetId ?? null,
      metadata: event.metadata ?? {},
      request_id: event.requestId ?? null,
    });
  if (error) {
    // The primary action already succeeded; surface loudly but don't undo it.
    logger.error("audit.write_failed", { action: event.action, error: error.message });
  }
}
