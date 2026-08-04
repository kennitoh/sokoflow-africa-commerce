import {
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

import type { NavItem } from "@/types";

export const BRAND = {
  name: "SokoFlow",
  tagline: "Run your business. Sell with confidence.",
} as const;

export const primaryNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, description: "Business overview" },
  { title: "Orders", url: "/orders", icon: ShoppingCart, description: "Sales and fulfilment" },
  { title: "Products", url: "/products", icon: Package, description: "Catalogue" },
  { title: "Customers", url: "/customers", icon: Users, description: "Buyer relationships" },
  { title: "Inventory", url: "/inventory", icon: Boxes, description: "Stock levels" },
  { title: "Settings", url: "/settings", icon: Settings, description: "Workspace preferences" },
];
