import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageCheck,
  PlusCircle,
  Ban,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  channelMeta,
  orderStatusMeta,
  orderStatusOrder,
  paymentStatusMeta,
} from "@/features/orders/order-status";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatMoney, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { activityService } from "@/services/activity.service";
import { orderService } from "@/services/order.service";
import type { OrderStatus, PaymentStatus } from "@/types";

type OrderDetailSheetProps = {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function OrderDetailSheet({ orderId, onOpenChange }: OrderDetailSheetProps) {
  const { currency } = useWorkspace();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.get(orderId!),
    enabled: Boolean(orderId),
  });

  const activityQuery = useQuery({
    queryKey: ["activity", "order", orderId],
    queryFn: () => activityService.forEntity(orderId!),
    enabled: Boolean(orderId),
  });

  const order = orderQuery.data ?? null;

  useEffect(() => {
    setNotes(order?.notes ?? "");
  }, [order?.id, order?.notes]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  }

  const setStatus = useMutation({
    mutationFn: (status: OrderStatus) => orderService.updateStatus([orderId!], status),
    onSuccess: (_data, status) => {
      refresh();
      toast.success(`Order marked as ${orderStatusMeta[status].label.toLowerCase()}`);
    },
    onError: () => toast.error("Couldn't update the order — try again"),
  });

  const setPayment = useMutation({
    mutationFn: (status: PaymentStatus) =>
      orderService.updatePayment(orderId!, status, Number(order?.total ?? 0)),
    onSuccess: (_data, status) => {
      refresh();
      toast.success(`Payment marked as ${paymentStatusMeta[status].label.toLowerCase()}`);
    },
    onError: () => toast.error("Couldn't update the payment — try again"),
  });

  const saveNotes = useMutation({
    mutationFn: (value: string) => orderService.updateNotes(orderId!, value),
    onSuccess: () => {
      refresh();
      toast.success("Notes saved");
    },
    onError: () => toast.error("Couldn't save notes — try again"),
  });

  // Orders are never hard-deleted — cancelling keeps the financial history and
  // restores stock exactly once via the cancel_order transaction.
  const cancelOrder = useMutation({
    mutationFn: () => orderService.cancel(orderId!),
    onSuccess: () => {
      refresh();
      toast.success("Order cancelled and stock restored");
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't cancel the order"),
  });

  const timeline = order
    ? [
        {
          id: "created",
          icon: PlusCircle,
          label: "Order placed",
          at: order.created_at,
        },
        ...(activityQuery.data ?? [])
          .filter((entry) => entry.action !== "created")
          .map((entry) => ({
            id: entry.id,
            icon: entry.action.startsWith("payment") ? CreditCard : PackageCheck,
            label: entry.message,
            at: entry.created_at,
          })),
        order.status === "delivered"
          ? { id: "delivered", icon: CheckCircle2, label: "Delivered", at: order.created_at }
          : null,
      ].filter((event): event is { id: string; icon: typeof PlusCircle; label: string; at: string } =>
        Boolean(event),
      )
    : [];

  return (
    <Sheet open={Boolean(orderId)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 sm:px-6">
          <SheetTitle className="text-lg">{order?.order_number ?? "Order"}</SheetTitle>
          <SheetDescription className="text-xs">
            {order
              ? `${order.customer_name ?? "Walk-in customer"} · ${channelMeta[order.channel].label} · ${timeAgo(order.created_at)}`
              : "Loading order…"}
          </SheetDescription>
        </SheetHeader>

        {orderQuery.isError ? (
          <div className="flex-1 p-4 sm:p-6">
            <ErrorState error={orderQuery.error} onRetry={() => orderQuery.refetch()} />
          </div>
        ) : orderQuery.isLoading || !order ? (
          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6" aria-hidden>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={orderStatusMeta[order.status].tone}>
                  {orderStatusMeta[order.status].label}
                </StatusPill>
                <StatusPill tone={paymentStatusMeta[order.payment_status].tone}>
                  {paymentStatusMeta[order.payment_status].label}
                </StatusPill>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Items
                </p>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{item.product_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.quantity} × {formatMoney(Number(item.unit_price), currency)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatMoney(Number(item.total), currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatMoney(Number(order.subtotal), currency)} />
                {Number(order.discount) > 0 && (
                  <Row label="Discount" value={`− ${formatMoney(Number(order.discount), currency)}`} />
                )}
                {Number(order.delivery_fee) > 0 && (
                  <Row label="Delivery" value={formatMoney(Number(order.delivery_fee), currency)} />
                )}
                <Separator className="my-2" />
                <Row
                  label="Total"
                  value={formatMoney(Number(order.total), currency)}
                  className="text-base font-bold"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Move to
                </p>
                <div className="flex flex-wrap gap-2">
                  {orderStatusOrder
                    .filter((status) => status !== order.status)
                    .map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate(status)}
                      >
                        {setStatus.isPending && setStatus.variables === status && (
                          <Loader2 className="size-3.5 animate-spin" />
                        )}
                        {orderStatusMeta[status].label}
                      </Button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Payment
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["unpaid", "partial", "paid", "refunded"] as PaymentStatus[])
                    .filter((status) => status !== order.payment_status)
                    .map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={setPayment.isPending}
                        onClick={() => setPayment.mutate(status)}
                      >
                        {setPayment.isPending && setPayment.variables === status && (
                          <Loader2 className="size-3.5 animate-spin" />
                        )}
                        {paymentStatusMeta[status].label}
                      </Button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Timeline
                </p>
                <ul className="space-y-3 border-l border-border pl-4">
                  {timeline.map((event) => (
                    <li key={event.id} className="relative text-sm">
                      <span className="absolute top-1 -left-[21px] grid size-4 place-items-center rounded-full bg-primary-soft text-primary">
                        <event.icon className="size-3" aria-hidden />
                      </span>
                      <p className="font-medium">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(event.at)}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Internal notes
                </p>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Notes only your team can see — delivery instructions, special requests…"
                  className="min-h-24 rounded-xl"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  disabled={saveNotes.isPending || notes === (order.notes ?? "")}
                  onClick={() => saveNotes.mutate(notes)}
                >
                  {saveNotes.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Save notes
                </Button>
              </div>

              {order.customer_id && (
                <Button asChild variant="ghost" size="sm" className="px-0">
                  <Link to="/customers/$customerId" params={{ customerId: order.customer_id }}>
                    View customer <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-4 sm:px-6">
              {orderStatusMeta[order.status].next && (
                <Button
                  className="h-11 flex-1 rounded-xl"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate(orderStatusMeta[order.status].next!)}
                >
                  {setStatus.isPending && <Loader2 className="size-4 animate-spin" />}
                  {orderStatusMeta[order.status].nextLabel}
                </Button>
              )}
              {order.status !== "cancelled" && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cancel order and restore stock"
                  className="text-destructive"
                  disabled={cancelOrder.isPending}
                  onClick={() => cancelOrder.mutate()}
                >
                  {cancelOrder.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Ban className="size-4" />
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
