import { supabase } from "@/integrations/supabase/client";
import type { Store } from "@/types";

const SELECT = "id, name, slug, is_published, settings";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "my-store"
  );
}

/**
 * The store record is the anchor for future storefront / channel work.
 * Today it is created silently during onboarding and never shown as a module.
 */
export const storeService = {
  async current(): Promise<Store | null> {
    const { data, error } = await supabase
      .from("stores")
      .select(SELECT)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Store | null) ?? null;
  },

  async ensure(input: { name: string; channels: string[]; country?: string | null }): Promise<Store> {
    const existing = await storeService.current();
    if (existing) return existing;

    const { data, error } = await supabase
      .from("stores")
      .insert({
        name: input.name,
        slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`,
        settings: { channels: input.channels, country: input.country ?? null },
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    return data as Store;
  },
};
