import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  PackageCheck,
  Plus,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNewOrder } from "@/features/orders/new-order-context";
import { OrderDetailSheet } from "@/features/orders/order-detail-sheet";
import { orderStatusMeta, paymentStatusMeta } from "@/features/orders/order-status";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatMoney, initials, timeAgo, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { activityService } from "@/services/activity.service";
import { customerService } from "@/services/customer.service";
import { orderService } from "@/services/order.service";
import { isLowStock, productService } from "@/services/product.service";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Today's work — SokoFlow" },
      {
        name: "description",
        content:
          "See what needs packing, who still owes you and what to restock — then finish today's work in minutes.",
      },
      { property: "og:title", content: "Today's work — SokoFlow" },
      {
        property: "og:description",
        content: "Your daily commerce workspace: pending orders, deliveries and low stock.",
      },
    ],
  }),
  component: HomePage,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function HomePage() {
  const { currency, ownerName, businessName } = useWorkspace();
  const { openNewOrder } = useNewOrder();
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: orderService.list });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: productService.list });
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: customerService.list });
  const activityQuery = useQuery({ queryKey: ["activity"], queryFn: () => activityService.recent(6) });

  const orders = ordersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const today = todayISO();

  const pending = orders.filter((order) => order.status === "pending");
  const readyToPack = orders.filter((order) => order.status === "confirmed");
  const deliveriesToday = orders.filter(
    (order) =>
      (order.delivery_date === today || order.created_at.slice(0, 10) === today) &&
      ["packed", "out_for_delivery"].includes(order.status),
  );
  const lowStock = products.filter(isLowStock);
  const unpaidTotal = orders
    .filter((order) => order.payment_status !== "paid" && order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total) - Number(order.amount_paid), 0);

  const tiles = [
    {
      label: "Pending orders",
      value: pending.length,
      hint: "Waiting for you to confirm",
      icon: ClipboardList,
      to: "/orders" as const,
    },
    {
      label: "Ready to pack",
      value: readyToPack.length,
      hint: "Confirmed and paid for packing",
      icon: PackageCheck,
      to: "/orders" as const,
    },
    {
      label: "Deliveries today",
      value: deliveriesToday.length,
      hint: "On the way to customers",
      icon: Truck,
      to: "/orders" as const,
    },
    {
      label: "Low stock",
      value: lowStock.length,
      hint: "Items to restock soon",
      icon: Boxes,
      to: "/products" as const,
    },
  ];

  return (
    <>
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {greeting()}, {ownerName}
        </p>
        <h1 className="truncate text-2xl font-bold sm:text-3xl">{businessName}</h1>
        <p className="text-sm text-muted-foreground">
          {orders.length === 0
            ? "Let's record your first order — it takes about twenty seconds."
            : `${pending.length + readyToPack.length} orders need you today · ${formatMoney(unpaidTotal, currency)} still to collect.`}
        </p>
      </header>

      <Button onClick={openNewOrder} size="lg" className="h-12 w-full rounded-xl text-base sm:w-auto">
        <Plus className="size-5" /> New order
      </Button>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} to={tile.to}>
            <Card className="h-full shadow-soft transition-shadow hover:shadow-card">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {tile.label}
                  </p>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <tile.icon className="size-4" />
                  </span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{tile.value}</p>
                <p className="truncate text-xs text-muted-foreground">{tile.hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction icon={Plus} label="Record a sale" hint="New order" onClick={openNewOrder} />
          <QuickAction icon={UserPlus} label="Add a customer" hint="Customers" to="/customers" />
          <QuickAction icon={Boxes} label="Update stock" hint="Products" to="/products" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Recent orders</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/orders">
                  All orders <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            {orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No orders yet"
                description="Every sale you take on WhatsApp, Instagram or in store lives here. Record the first one and SokoFlow tracks payment, packing and delivery for you."
                action={
                  <Button size="sm" onClick={openNewOrder}>
                    <Plus className="size-4" /> New order
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {orders.slice(0, 6).map((order) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setOpenOrderId(order.id)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">
                            {order.customer_name ?? "Walk-in customer"}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {order.order_number}
                          </span>
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <StatusPill tone={orderStatusMeta[order.status].tone}>
                            {orderStatusMeta[order.status].label}
                          </StatusPill>
                          <StatusPill tone={paymentStatusMeta[order.payment_status].tone}>
                            {paymentStatusMeta[order.payment_status].label}
                          </StatusPill>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold">
                          {formatMoney(Number(order.total), currency)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {timeAgo(order.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Recent customers</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/customers">
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              {customers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Customers appear here as soon as you save your first order.
                </p>
              ) : (
                <ul className="space-y-2">
                  {customers.slice(0, 5).map((customer) => (
                    <li key={customer.id}>
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: customer.id }}
                        className="flex items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-accent/60"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                          {initials(customer.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{customer.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {customer.phone || customer.instagram || "No contact yet"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-base font-semibold">Recent activity</h2>
              {(activityQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Your workspace history will show here — orders created, payments received and stock
                  changes.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(activityQuery.data ?? []).map((entry) => (
                    <li key={entry.id} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="min-w-0">
                        <span className="block text-sm">{entry.message}</span>
                        <span className="block text-xs text-muted-foreground">
                          {timeAgo(entry.created_at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Low stock alerts</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/products">
                  Manage stock <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {lowStock.slice(0, 6).map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{product.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      Alert level {product.low_stock_threshold}
                    </span>
                  </span>
                  <StatusPill tone={product.stock === 0 ? "danger" : "warning"}>
                    {product.stock} left
                  </StatusPill>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <OrderDetailSheet orderId={openOrderId} onOpenChange={() => setOpenOrderId(null)} />
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  hint,
  onClick,
  to,
}: {
  icon: typeof Plus;
  label: string;
  hint: string;
  onClick?: () => void;
  to?: "/customers" | "/products";
}) {
  const body = (
    <span className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </span>
  );

  const className = cn(
    "w-full rounded-xl border border-border bg-card p-4 text-left shadow-soft transition-shadow hover:shadow-card",
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
