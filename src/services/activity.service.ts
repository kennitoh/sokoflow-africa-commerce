import { supabase } from "@/integrations/supabase/client";
import type { ActivityEntry } from "@/types";

export const activityService = {
  async log(entry: {
    entity_type: string;
    entity_id?: string | null;
    action: string;
    message: string;
  }) {
    const { error } = await supabase.from("activity_log").insert({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      action: entry.action,
      message: entry.message,
    });
    if (error) console.error(error);
  },

  async forEntity(entityId: string, limit = 20): Promise<ActivityEntry[]> {
    const { data, error } = await supabase
      .from("activity_log")
      .select("id, entity_type, entity_id, action, message, created_at")
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ActivityEntry[];
  },

  async recent(limit = 8): Promise<ActivityEntry[]> {
    const { data, error } = await supabase
      .from("activity_log")
      .select("id, entity_type, entity_id, action, message, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as ActivityEntry[];
  },
};
