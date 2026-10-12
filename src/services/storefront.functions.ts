import { createServerFn } from "@tanstack/react-start";

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
};

export type PublicStorefront = {
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  currency: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  products: PublicProduct[];
};

const SLUG = /^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$/;

/** Public, unauthenticated read of a published storefront via the narrow public_storefront RPC. */
export const getStorefront = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input.slug ?? "").toLowerCase() }))
  .handler(async ({ data }): Promise<PublicStorefront | null> => {
    if (!SLUG.test(data.slug)) return null;
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Storefront is temporarily unavailable.");
    const response = await fetch(`${url}/rest/v1/rpc/public_storefront`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_slug: data.slug }),
    });
    if (!response.ok) throw new Error("Storefront is temporarily unavailable.");
    return ((await response.json()) as PublicStorefront | null) ?? null;
  });
