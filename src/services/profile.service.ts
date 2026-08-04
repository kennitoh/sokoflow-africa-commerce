import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";

export const profileService = {
  async get(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, phone, avatar_url, currency")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profile)
      .select("id, full_name, business_name, phone, avatar_url, currency")
      .single();
    if (error) throw error;
    return data;
  },
};
