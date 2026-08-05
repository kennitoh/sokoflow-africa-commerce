import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardList,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
} from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerFormSheet } from "@/features/customers/customer-form-sheet";
import { useNewOrder } from "@/features/orders/new-order-context";
import { OrderDetailSheet } from "@/features/orders/order-detail-sheet";
import { orderStatusMeta, paymentStatusMeta } from "@/features/orders/order-status";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatMoney, initials, timeAgo } from "@/lib/format";
import { customerService } from "@/services/customer.service";
import { orderService } from "@/services/order.service";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer profile — SokoFlow" },
      {
        name: "description",
        content:
          "Contact details, lifetime spend, average order value and full order history for one customer.",
      },
      { property: "og:title", content: "Customer profile — SokoFlow" },
      { property: "og:description", content: "One customer, their spend and their full history." },
    ],
  }),
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const { customerId } = Route.useParams();
  const { currency } = useWorkspace();
  const { openNewOrder } = useNewOrder();
  const [editOpen, setEditOpen] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const customerQuery = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => customerService.get(customerId),
  });
  const ordersQuery = useQuery({
    queryKey: ["orders", "customer", customerId],
    queryFn: () => orderService.byCustomer(customerId),
  });

  const customer = customerQuery.data ?? null;
  const orders = ordersQuery.data ?? [];
  const paidOrders = orders.filter((order) => order.status !== "cancelled");
  const lifetime = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const average = paidOrders.length > 0 ? lifetime / paidOrders.length : 0;
  const last = paidOrders[0];

  if (customerQuery.isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Customer not found"
        description="This customer may have been deleted. Head back to your customer list to find the right person."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/customers">Back to customers</Link>
          </Button>
        }
      />
    );
  }

  const stats = [
    { label: "Lifetime spend", value: formatMoney(lifetime, currency) },
    { label: "Orders", value: String(paidOrders.length) },
    { label: "Average order", value: formatMoney(average, currency) },
    { label: "Last purchase", value: last ? timeAgo(last.created_at) : "No orders yet" },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to="/customers">
          <ArrowLeft className="size-4" /> Customers
        </Link>
      </Button>

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-base font-bold text-primary">
            {initials(customer.name)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{customer.name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              Customer since {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
          <Button className="rounded-xl" onClick={openNewOrder}>
            <Plus className="size-4" /> Order
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-soft">
            <CardContent className="space-y-1 p-5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {stat.label}
              </p>
              <p className="truncate text-xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-base font-semibold">Contact</h2>
            <ul className="space-y-3 text-sm">
              <ContactRow icon={Phone} value={customer.phone} fallback="No phone saved" />
              <ContactRow icon={MessageCircle} value={customer.whatsapp} fallback="No WhatsApp saved" />
              <ContactRow
                icon={Instagram}
                value={customer.instagram ? `@${customer.instagram}` : null}
                fallback="No Instagram saved"
              />
              <ContactRow icon={Mail} value={customer.email} fallback="No email saved" />
              <ContactRow
                icon={MapPin}
                value={[customer.address, customer.city].filter(Boolean).join(", ") || null}
                fallback="No delivery address saved"
              />
            </ul>
            {customer.notes && (
              <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                {customer.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-base font-semibold">Order history</h2>
            {orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No orders from this customer yet"
                description="Create an order for them and their spend, average order value and timeline fill in automatically."
                action={
                  <Button size="sm" onClick={openNewOrder}>
                    <Plus className="size-4" /> New order
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {orders.map((order) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setOpenOrderId(order.id)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{order.order_number}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
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
      </div>

      <CustomerFormSheet open={editOpen} customer={customer} onOpenChange={setEditOpen} />
      <OrderDetailSheet orderId={openOrderId} onOpenChange={() => setOpenOrderId(null)} />
    </>
  );
}

function ContactRow({
  icon: Icon,
  value,
  fallback,
}: {
  icon: typeof Phone;
  value: string | null;
  fallback: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className={value ? "truncate" : "truncate text-muted-foreground"}>
        {value ?? fallback}
      </span>
    </li>
  );
}
