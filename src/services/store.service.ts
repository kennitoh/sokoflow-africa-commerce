import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Store } from "@/types";

const SELECT = "id, name, slug, is_published, settings";

export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$/;

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "my-store"
  );
}

export type PublicContact = {
  whatsapp?: boolean;
  phone?: boolean;
  email?: boolean;
  location?: boolean;
  social?: boolean;
};

/**
 * The store record anchors the public storefront. Owner access is enforced by RLS
 * (auth.uid() = user_id); slug uniqueness is enforced by a database unique index.
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

  async updatePublishing(
    store: Store,
    input: { is_published: boolean; slug: string; public_contact: PublicContact },
  ): Promise<Store> {
    const slug = input.slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(
        "Link name must be 3–48 characters: lowercase letters, numbers and dashes, not starting or ending with a dash.",
      );
    }
    const settings = { ...(store.settings ?? {}), public_contact: input.public_contact } as Json;
    const { data, error } = await supabase
      .from("stores")
      .update({ is_published: input.is_published, slug, settings })
      .eq("id", store.id)
      .select(SELECT)
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("That link name is already taken. Try another.");
      throw new Error("Could not update publishing. Please try again.");
    }
    return data as Store;
  },
};
