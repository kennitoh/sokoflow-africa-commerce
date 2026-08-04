import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export type Credentials = { email: string; password: string };

export type SignUpInput = Credentials & {
  fullName: string;
  businessName: string;
};

export const authService = {
  async signIn({ email, password }: Credentials) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp({ email, password, fullName, businessName }: SignUpInput) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, business_name: businessName },
      },
    });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) throw result.error;
    return result;
  },

  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
