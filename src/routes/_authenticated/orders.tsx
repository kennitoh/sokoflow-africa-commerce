import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNewOrder } from "@/features/orders/new-order-context";
import { OrderDetailSheet } from "@/features/orders/order-detail-sheet";
import {
  channelMeta,
  orderStatusMeta,
  orderStatusOrder,
  paymentStatusMeta,
} from "@/features/orders/order-status";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatMoney, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { orderService } from "@/services/order.service";
import type { Order, OrderStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Orders — SokoFlow" },
      {
        name: "description",
        content:
          "Search, filter and move orders from pending to delivered with one tap. Know exactly who paid and what needs packing.",
      },
      { property: "og:title", content: "Orders — SokoFlow" },
      { property: "og:description", content: "Every sale, from pending to delivered, in one list." },
    ],
  }),
  component: OrdersPage,
});

type Tab = "all" | OrderStatus;

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  ...orderStatusOrder.map((status) => ({ key: status as Tab, label: orderStatusMeta[status].label })),
];

function OrdersPage() {
  const { currency } = useWorkspace();
  const { openNewOrder } = useNewOrder();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: orderService.list });
  const orders = ordersQuery.data ?? [];

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    for (const status of orderStatusOrder) {
      map[status] = orders.filter((order) => order.status === status).length;
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (tab !== "all" && order.status !== tab) return false;
      if (unpaidOnly && order.payment_status === "paid") return false;
      if (!needle) return true;
      return [order.order_number, order.customer_name, order.notes, channelMeta[order.channel].label]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle));
    });
  }, [orders, tab, unpaidOnly, query]);

  async function applyBulk(status: OrderStatus) {
    setBusy(true);
    try {
      await orderService.updateStatus(selected, status);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${selected.length} order(s) moved to ${orderStatusMeta[status].label}`);
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update those orders");
    } finally {
      setBusy(false);
    }
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((o) => selected.includes(o.id));

  return (
    <>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} total · tap any order to change its status.
          </p>
        </div>
        <Button onClick={openNewOrder} className="shrink-0 rounded-xl">
          <Plus className="size-4" /> New order
        </Button>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order number, customer or note…"
              aria-label="Search orders"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Button
            variant={unpaidOnly ? "default" : "outline"}
            className="h-11 shrink-0 rounded-xl"
            onClick={() => setUnpaidOnly((previous) => !previous)}
          >
            Unpaid only
          </Button>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-1.5">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                  tab === item.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {item.label}
                <span className="ml-1.5 opacity-70">{counts[item.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <span className="text-sm font-medium">{selected.length} selected</span>
            {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <div className="ml-auto flex flex-wrap gap-2">
              {(["confirmed", "packed", "out_for_delivery", "delivered"] as OrderStatus[]).map(
                (status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={busy}
                    onClick={() => applyBulk(status)}
                  >
                    {orderStatusMeta[status].label}
                  </Button>
                ),
              )}
              <Button size="icon" variant="ghost" aria-label="Clear selection" onClick={() => setSelected([])}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {ordersQuery.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={orders.length === 0 ? "No orders yet" : "Nothing in this view"}
            description={
              orders.length === 0
                ? "SokoFlow replaces your notebook and Excel sheet. Record a sale once and you'll always know who ordered, who paid and what still needs packing."
                : "Try another status tab, clear the unpaid filter, or search a different name."
            }
            action={
              orders.length === 0 ? (
                <Button size="sm" onClick={openNewOrder}>
                  <Plus className="size-4" /> Create your first order
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTab("all");
                    setQuery("");
                    setUnpaidOnly(false);
                  }}
                >
                  Reset filters
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
              {filtered.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setOpenOrderId(order.id)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {order.customer_name ?? "Walk-in customer"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.order_number} · {channelMeta[order.channel].label}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold">
                        {formatMoney(Number(order.total), currency)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <StatusPill tone={orderStatusMeta[order.status].tone}>
                        {orderStatusMeta[order.status].label}
                      </StatusPill>
                      <StatusPill tone={paymentStatusMeta[order.payment_status].tone}>
                        {paymentStatusMeta[order.payment_status].label}
                      </StatusPill>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {timeAgo(order.created_at)}
                      </span>
                    </div>
                    {orderStatusMeta[order.status].next && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 h-9 w-full rounded-lg"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected([order.id]);
                          void applyBulk(orderStatusMeta[order.status].next!);
                        }}
                      >
                        {orderStatusMeta[order.status].nextLabel}
                      </Button>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allVisibleSelected}
                          aria-label="Select all orders"
                          onCheckedChange={(checked) =>
                            setSelected(checked ? filtered.map((order) => order.id) : [])
                          }
                        />
                      </TableHead>
                      <TableHead className="text-xs uppercase">Order</TableHead>
                      <TableHead className="text-xs uppercase">Customer</TableHead>
                      <TableHead className="text-xs uppercase">Status</TableHead>
                      <TableHead className="text-xs uppercase">Payment</TableHead>
                      <TableHead className="text-xs uppercase">Channel</TableHead>
                      <TableHead className="text-right text-xs uppercase">Total</TableHead>
                      <TableHead className="text-right text-xs uppercase">Next</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        currency={currency}
                        selected={selected.includes(order.id)}
                        onToggle={(checked) =>
                          setSelected((previous) =>
                            checked
                              ? [...previous, order.id]
                              : previous.filter((id) => id !== order.id),
                          )
                        }
                        onOpen={() => setOpenOrderId(order.id)}
                        onAdvance={(status) => {
                          setSelected([order.id]);
                          void applyBulk(status);
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <OrderDetailSheet orderId={openOrderId} onOpenChange={() => setOpenOrderId(null)} />
    </>
  );
}

function OrderRow({
  order,
  currency,
  selected,
  onToggle,
  onOpen,
  onAdvance,
}: {
  order: Order;
  currency: string;
  selected: boolean;
  onToggle: (checked: boolean) => void;
  onOpen: () => void;
  onAdvance: (status: OrderStatus) => void;
}) {
  const meta = orderStatusMeta[order.status];
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={selected}
          aria-label={`Select ${order.order_number}`}
          onCheckedChange={(checked) => onToggle(Boolean(checked))}
        />
      </TableCell>
      <TableCell className="text-sm font-medium">
        {order.order_number}
        <span className="block text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
      </TableCell>
      <TableCell className="max-w-48 truncate text-sm">
        {order.customer_name ?? "Walk-in customer"}
      </TableCell>
      <TableCell>
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      </TableCell>
      <TableCell>
        <StatusPill tone={paymentStatusMeta[order.payment_status].tone}>
          {paymentStatusMeta[order.payment_status].label}
        </StatusPill>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {channelMeta[order.channel].label}
      </TableCell>
      <TableCell className="text-right text-sm font-semibold">
        {formatMoney(Number(order.total), currency)}
      </TableCell>
      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
        {meta.next && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => onAdvance(meta.next!)}>
            {meta.nextLabel}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
