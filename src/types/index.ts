import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  description?: string;
};

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export type SalesChannelKey = "instagram" | "whatsapp" | "facebook" | "tiktok" | "physical_store";

export type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  business_type: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  country: string | null;
  address: string | null;
  city: string | null;
  timezone: string;
  description: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  sales_channels: string[];
  onboarding_completed: boolean;
  currency: string;
};

export type Store = {
  id: string;
  name: string;
  slug: string | null;
  is_published: boolean;
  settings: Record<string, unknown>;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type SalesChannel =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "walk_in"
  | "website"
  | "marketplace"
  | "api";

export type ProductStatus = "active" | "draft" | "archived";

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  price: number;
  cost: number | null;
  stock: number;
  low_stock_threshold: number;
  image_url: string | null;
  status: ProductStatus;
  published_to_web: boolean;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  value: string | null;
  sku: string | null;
  price: number | null;
  stock: number;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  total: number;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  channel: SalesChannel;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  amount_paid: number;
  delivery_address: string | null;
  delivery_date: string | null;
  notes: string | null;
  created_at: string;
};

export type OrderWithItems = Order & { items: OrderItem[] };

export type ActivityEntry = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  message: string;
  created_at: string;
};

export type NewOrderLine = {
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
};

export type NewOrderInput = {
  customer_id: string | null;
  customer_name: string;
  channel: SalesChannel;
  status: OrderStatus;
  payment_status: PaymentStatus;
  discount: number;
  delivery_fee: number;
  amount_paid: number;
  delivery_address: string | null;
  delivery_date: string | null;
  notes: string | null;
  lines: NewOrderLine[];
};
