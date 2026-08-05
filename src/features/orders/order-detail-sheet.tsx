import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import type { OrderStatus, PaymentStatus } from "@/types";

type OrderDetailSheetProps = {
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function OrderDetailSheet({ orderId, onOpenChange }: OrderDetailSheetProps) {
  const { currency } = useWorkspace();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.get(orderId!),
    enabled: Boolean(orderId),
  });

  const order = orderQuery.data ?? null;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  }

  const setStatus = useMutation({
    mutationFn: (status: OrderStatus) => orderService.updateStatus([orderId!], status),
    onSuccess: () => {
      refresh();
      toast.success("Order updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const setPayment = useMutation({
    mutationFn: (status: PaymentStatus) =>
      orderService.updatePayment(orderId!, status, Number(order?.total ?? 0)),
    onSuccess: () => {
      refresh();
      toast.success("Payment updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const removeOrder = useMutation({
    mutationFn: () => orderService.remove([orderId!]),
    onSuccess: () => {
      refresh();
      onOpenChange(false);
      toast.success("Order deleted");
    },
  });

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

        {orderQuery.isLoading || !order ? (
          <div className="grid flex-1 place-items-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
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

              {order.notes && (
                <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                  {order.notes}
                </div>
              )}

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
                        {paymentStatusMeta[status].label}
                      </Button>
                    ))}
                </div>
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
                  {orderStatusMeta[order.status].nextLabel}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete order"
                className="text-destructive"
                onClick={() => removeOrder.mutate()}
              >
                <Trash2 className="size-4" />
              </Button>
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
