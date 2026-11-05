import { supabase } from "@/integrations/supabase/client";
import type { Product, ProductVariant } from "@/types";

const SELECT =
  "id, name, sku, category, description, price, cost, stock, low_stock_threshold, image_url, status, published_to_web, created_at";

export type ProductInput = {
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  price: number;
  cost?: number | null;
  stock: number;
  low_stock_threshold: number;
  image_url?: string | null;
  status: Product["status"];
  published_to_web?: boolean;
};

export const productService = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select(SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Product[];
  },

  async variants(): Promise<ProductVariant[]> {
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, product_id, name, value, sku, price, stock");
    if (error) throw error;
    return (data ?? []) as ProductVariant[];
  },

  async create(input: ProductInput): Promise<Product> {
    const { data, error } = await supabase.from("products").insert(input).select(SELECT).single();
    if (error) throw error;
    return data as Product;
  },

  async update(id: string, input: Partial<ProductInput>): Promise<Product> {
    // Stock never travels through a plain product update: it must go through adjustStock so
    // a matching stock movement is always recorded.
    const changes: Partial<ProductInput> = { ...input };
    delete changes.stock;
    const { data, error } = await supabase
      .from("products")
      .update(changes)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return data as Product;
  },

  // Atomic stock change on the server: locks the row, refuses a result below zero,
  // and records the stock movement with its reason — all in one step.
  async adjustStock(product: Product, change: number, note?: string) {
    const { data, error } = await supabase.rpc("adjust_product_stock", {
      p_product_id: product.id,
      p_change: change,
      p_reason: "adjustment",
      p_note: note ?? null,
    });
    if (error) throw new Error(error.message.replace(/^ERROR:\s*/i, "").trim() || "Could not update stock");
    return Number(data);
  },

  async remove(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },

  async duplicate(product: Product): Promise<Product> {
    const input: ProductInput = {
      name: `${product.name} (copy)`,
      sku: product.sku ?? null,
      category: product.category ?? null,
      description: product.description ?? null,
      price: Number(product.price) || 0,
      cost: product.cost ?? null,
      stock: product.stock ?? 0,
      low_stock_threshold: product.low_stock_threshold ?? 5,
      image_url: product.image_url ?? null,
      status: product.status,
    };
    return productService.create(input);
  },
};

export function isLowStock(product: Product) {
  return product.stock <= product.low_stock_threshold;
}
