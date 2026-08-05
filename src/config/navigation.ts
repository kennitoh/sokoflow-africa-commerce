import {
  Boxes,
  Home,
  LineChart,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

import type { NavItem } from "@/types";

export const BRAND = {
  name: "SokoFlow",
  tagline: "Finish today's work, fast.",
} as const;

export const primaryNav: NavItem[] = [
  { title: "Home", url: "/home", icon: Home, description: "Today's work" },
  { title: "Orders", url: "/orders", icon: ShoppingCart, description: "Sales and fulfilment" },
  { title: "Products", url: "/products", icon: Package, description: "Catalogue and stock" },
  { title: "Customers", url: "/customers", icon: Users, description: "Buyer relationships" },
  { title: "Insights", url: "/insights", icon: LineChart, description: "Revenue and trends" },
  { title: "Settings", url: "/settings", icon: Settings, description: "Workspace preferences" },
];

export const mobileNav: NavItem[] = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Products", url: "/products", icon: Package },
  { title: "Customers", url: "/customers", icon: Users },
];

export const stockNav: NavItem = {
  title: "Inventory",
  url: "/products",
  icon: Boxes,
  description: "Stock levels live inside Products",
};
