import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  description?: string;
};

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export type OrderStatusKey = "paid" | "pending" | "fulfilled" | "refunded" | "cancelled";

export type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  currency: string;
};
