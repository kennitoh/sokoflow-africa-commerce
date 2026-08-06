import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  PackageX,
  Truck,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { timeAgo, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { activityService } from "@/services/activity.service";
import { isLowStock, productService } from "@/services/product.service";
import { orderService } from "@/services/order.service";

const STORAGE_KEY = "sokoflow.notifications.read";

type Tone = "warning" | "destructive" | "success" | "info";

type Notification = {
  id: string;
  tone: Tone;
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  timestamp: number;
  to: string;
  actionable: boolean;
};

const toneClasses: Record<Tone, string> = {
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
  success: "bg-success/15 text-success",
  info: "bg-primary-soft text-primary",
};

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage failures
  }
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed());
  const navigate = useNavigate();

  const productsQuery = useQuery({ queryKey: ["products"], queryFn: productService.list, enabled: open });
  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: orderService.list, enabled: open });
  const activityQuery = useQuery({
    queryKey: ["activity"],
    queryFn: () => activityService.recent(8),
    enabled: open,
  });

  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];
    const products = productsQuery.data ?? [];
    const orders = ordersQuery.data ?? [];
    const activity = activityQuery.data ?? [];
    const today = todayISO();

    const outOfStock = products.filter((product) => product.stock <= 0);
    const lowStock = products.filter((product) => isLowStock(product) && product.stock > 0);

    if (outOfStock.length > 0) {
      items.push({
        id: "products-out-of-stock",
        tone: "destructive",
        icon: PackageX,
        title: `${outOfStock.length} product${outOfStock.length > 1 ? "s" : ""} out of stock`,
        description: outOfStock
          .slice(0, 3)
          .map((product) => product.name)
          .join(", "),
        time: "Now",
        timestamp: Date.now(),
        to: "/products",
        actionable: true,
      });
    }

    if (lowStock.length > 0) {
      items.push({
        id: "products-low-stock",
        tone: "warning",
        icon: AlertTriangle,
        title: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} running low`,
        description: lowStock
          .slice(0, 3)
          .map((product) => `${product.name} (${product.stock} left)`)
          .join(", "),
        time: "Now",
        timestamp: Date.now(),
        to: "/products",
        actionable: true,
      });
    }

    const deliveriesToday = orders.filter(
      (order) =>
        order.delivery_date === today &&
        order.status !== "delivered" &&
        order.status !== "cancelled",
    );
    if (deliveriesToday.length > 0) {
      items.push({
        id: "orders-delivery-today",
        tone: "info",
        icon: Truck,
        title: `${deliveriesToday.length} delivery${deliveriesToday.length > 1 ? "ies" : ""} scheduled today`,
        description: deliveriesToday
          .slice(0, 3)
          .map((order) => order.customer_name)
          .join(", "),
        time: "Today",
        timestamp: Date.now(),
        to: "/orders",
        actionable: true,
      });
    }

    const awaitingPayment = orders.filter(
      (order) =>
        (order.payment_status === "unpaid" || order.payment_status === "partial") &&
        order.status !== "cancelled",
    );
    if (awaitingPayment.length > 0) {
      items.push({
        id: "orders-awaiting-payment",
        tone: "warning",
        icon: Wallet,
        title: `${awaitingPayment.length} order${awaitingPayment.length > 1 ? "s" : ""} awaiting payment`,
        description: awaitingPayment
          .slice(0, 3)
          .map((order) => `#${order.order_number}`)
          .join(", "),
        time: "Now",
        timestamp: Date.now(),
        to: "/orders",
        actionable: true,
      });
    }

    const recentlyDelivered = orders
      .filter((order) => order.status === "delivered")
      .slice(0, 3);
    for (const order of recentlyDelivered) {
      items.push({
        id: `order-delivered-${order.id}`,
        tone: "success",
        icon: CheckCircle2,
        title: `Order #${order.order_number} delivered`,
        description: order.customer_name,
        time: timeAgo(order.created_at),
        timestamp: new Date(order.created_at).getTime(),
        to: "/orders",
        actionable: false,
      });
    }

    for (const entry of activity.slice(0, 5)) {
      items.push({
        id: `activity-${entry.id}`,
        tone: "info",
        icon: Info,
        title: entry.message,
        description: entry.entity_type,
        time: timeAgo(entry.created_at),
        timestamp: new Date(entry.created_at).getTime(),
        to:
          entry.entity_type === "customer" && entry.entity_id
            ? (`/customers/${entry.entity_id}` as string)
            : entry.entity_type === "product"
              ? "/products"
              : "/orders",
        actionable: false,
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [productsQuery.data, ordersQuery.data, activityQuery.data]);

  const visible = notifications.filter((item) => !dismissed.includes(item.id));
  const unreadCount = visible.filter((item) => item.actionable).length;
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  function markAllAsRead() {
    const ids = Array.from(new Set([...dismissed, ...notifications.map((item) => item.id)]));
    setDismissed(ids);
    writeDismissed(ids);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {badgeLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[90vw] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} need attention` : "All caught up"}
            </p>
          </div>
          {visible.length > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <CheckCircle2 className="size-6 text-success" aria-hidden />
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs text-muted-foreground">No new notifications right now.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60"
                    onClick={() => {
                      setOpen(false);
                      navigate({ to: item.to });
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        toneClasses[item.tone],
                      )}
                      aria-hidden
                    >
                      <item.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {item.description && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.time}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
