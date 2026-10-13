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
    const { data, error } = await supabase
      .from("products")
      .update(input)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return data as Product;
  },

  async adjustStock(product: Product, change: number, note?: string) {
    const nextStock = Math.max(0, product.stock + change);
    const { error } = await supabase
      .from("products")
      .update({ stock: nextStock })
      .eq("id", product.id);
    if (error) throw error;
    await supabase.from("stock_movements").insert({
      product_id: product.id,
      change,
      reason: "adjustment",
      note: note ?? null,
    });
    return nextStock;
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
