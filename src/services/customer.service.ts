import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "@/types";

const SELECT =
  "id, name, phone, whatsapp, instagram, email, address, city, notes, avatar_url, created_at";

export type CustomerInput = {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
};

export const customerService = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from("customers")
      .select(SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Customer[];
  },

  async get(id: string): Promise<Customer | null> {
    const { data, error } = await supabase.from("customers").select(SELECT).eq("id", id).maybeSingle();
    if (error) throw error;
    return data as Customer | null;
  },

  async create(input: CustomerInput): Promise<Customer> {
    const { data, error } = await supabase.from("customers").insert(input).select(SELECT).single();
    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, input: CustomerInput): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .update(input)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async remove(id: string) {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
  },
};
