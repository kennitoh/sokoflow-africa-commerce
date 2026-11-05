import { createServerFn } from "@tanstack/react-start";

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  image_url: string | null;
  in_stock: boolean;
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
    const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) throw new Error("Storefront is temporarily unavailable.");
    const response = await fetch(`${url}/rest/v1/rpc/public_storefront`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_slug: data.slug }),
    });
    if (!response.ok) throw new Error("Storefront is temporarily unavailable.");
    return ((await response.json()) as PublicStorefront | null) ?? null;
  });

export type CheckoutInput = {
  slug: string;
  idempotencyKey: string;
  customer: { name: string; phone: string; email?: string; fulfillment: "delivery" | "collection"; address?: string; note?: string };
  items: { product_id: string; quantity: number }[];
};

export type OrderConfirmation = {
  order_number: string;
  business_name: string;
  slug: string | null;
  currency: string;
  items: { name: string; quantity: number; unit_price: number; total: number }[];
  subtotal: number;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
};

async function callPublicRpc(fn: string, body: unknown) {
  const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Ordering is temporarily unavailable.");
  return fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Keyed SHA-256 hash: the key lives in server settings, never in the code or the attempt log. */
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Public guest checkout. Prices, totals, owner and stock are all resolved inside the public_checkout RPC. */
export const submitCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: CheckoutInput) => ({
    slug: String(input.slug ?? "").toLowerCase(),
    idempotencyKey: String(input.idempotencyKey ?? ""),
    customer: {
      name: String(input.customer?.name ?? "").slice(0, 200),
      phone: String(input.customer?.phone ?? "").slice(0, 50),
      email: String(input.customer?.email ?? "").slice(0, 300),
      fulfillment: input.customer?.fulfillment === "collection" ? "collection" : "delivery",
      address: String(input.customer?.address ?? "").slice(0, 600),
      note: String(input.customer?.note ?? "").slice(0, 1100),
    },
    items: (Array.isArray(input.items) ? input.items : []).slice(0, 60).map((i) => ({
      product_id: String(i?.product_id ?? ""),
      quantity: Number(i?.quantity),
    })),
  }))
  .handler(async ({ data }): Promise<{ ok: true; token: string } | { ok: false; error: string }> => {
    if (!SLUG.test(data.slug)) return { ok: false, error: "This business page is not available." };
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    // Source = connecting IP set by the edge (not client-controllable). Without a connection
    // address we refuse the order instead of putting every visitor into one shared bucket.
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-real-ip") ||
      (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      "";
    if (!ip) {
      return {
        ok: false,
        error: "We couldn't verify your connection. Please refresh the page and try again.",
      };
    }
    const secret = process.env['CHECKOUT_HASH_SECRET'];
    if (!secret) {
      console.error("CHECKOUT_HASH_SECRET is not configured");
      return { ok: false, error: "Ordering is temporarily unavailable. Please try again later." };
    }
    // Connection address and phone digits are keyed hashes, so raw values never reach the attempt log.
    const sourceHash = await hmacHex(secret, `sokoflow-checkout:${ip}`);
    const digits = (data.customer.phone.match(/\d/g) ?? []).join("");
    const phoneHash = digits.length >= 7 ? await hmacHex(secret, `sokoflow-phone:${digits}`) : "";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: body, error } = await supabaseAdmin.rpc("guarded_checkout", {
      p_source_hash: sourceHash,
      p_slug: data.slug,
      p_customer: { ...data.customer, phone_hash: phoneHash },
      p_items: data.items,
      p_idempotency_key: data.idempotencyKey,
    });
    if (error) {
      console.error("guarded_checkout failed", error.message);
      return { ok: false, error: "We couldn't place your order. Please try again." };
    }
    const res = body as { token?: string; error?: string; rate_limited?: boolean; retry_after?: number } | null;
    if (res?.rate_limited) {
      const mins = Math.max(1, Math.round((res.retry_after ?? 600) / 60));
      return { ok: false, error: `Too many order attempts right now. Please wait about ${mins} minutes and try again, or contact the business directly.` };
    }
    if (!res?.token) {
      return { ok: false, error: res?.error?.replace(/^ERROR:\s*/i, "") || "We couldn't place your order. Please try again." };
    }
    return { ok: true, token: res.token };
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const getOrderConfirmation = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => ({ token: String(input.token ?? "").toLowerCase() }))
  .handler(async ({ data }): Promise<OrderConfirmation | null> => {
    if (!UUID.test(data.token)) return null;
    const res = await callPublicRpc("public_order_confirmation", { p_token: data.token });
    if (!res.ok) throw new Error("Couldn't load your order.");
    return ((await res.json()) as OrderConfirmation | null) ?? null;
  });
