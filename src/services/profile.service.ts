import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";

const SELECT =
  "id, full_name, business_name, business_type, phone, whatsapp, email, avatar_url, logo_url, country, address, city, timezone, description, instagram_url, facebook_url, tiktok_url, sales_channels, onboarding_completed, currency";

export const profileService = {
  async get(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(SELECT)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as Profile | null) ?? null;
  },

  async upsert(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(profile)
      .select(SELECT)
      .single();
    if (error) throw error;
    return data as Profile;
  },
};
