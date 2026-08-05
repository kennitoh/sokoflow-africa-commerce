import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Loader2, Phone, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomerFormSheet } from "@/features/customers/customer-form-sheet";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatMoney, initials } from "@/lib/format";
import { customerService } from "@/services/customer.service";
import { orderService } from "@/services/order.service";

export const Route = createFileRoute("/_authenticated/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — SokoFlow" },
      {
        name: "description",
        content:
          "Every buyer with their phone, WhatsApp and Instagram, plus what they've spent and when they last ordered.",
      },
      { property: "og:title", content: "Customers — SokoFlow" },
      { property: "og:description", content: "Know your buyers and what they spend." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { currency } = useWorkspace();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: customerService.list });
  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: orderService.list });

  const customers = customersQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  const stats = useMemo(() => {
    const map = new Map<string, { spend: number; count: number }>();
    for (const order of orders) {
      if (!order.customer_id || order.status === "cancelled") continue;
      const current = map.get(order.customer_id) ?? { spend: 0, count: 0 };
      map.set(order.customer_id, {
        spend: current.spend + Number(order.total),
        count: current.count + 1,
      });
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.whatsapp, customer.instagram, customer.city]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle)),
    );
  }, [customers, query]);

  return (
    <>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} saved · tap a customer to see their full history.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="shrink-0 rounded-xl">
          <Plus className="size-4" /> Add customer
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, phone, Instagram or town…"
          aria-label="Search customers"
          className="h-11 rounded-xl pl-9"
        />
      </div>

      {customersQuery.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={customers.length === 0 ? "No customers saved yet" : "No customer matches that search"}
          description={
            customers.length === 0
              ? "Save your regulars with their phone, WhatsApp and Instagram handle. Next time they order you'll find them in one search instead of scrolling through chats."
              : "Check the spelling, or add this person as a new customer."
          }
          action={
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Add customer
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => {
            const stat = stats.get(customer.id) ?? { spend: 0, count: 0 };
            return (
              <li key={customer.id}>
                <Link to="/customers/$customerId" params={{ customerId: customer.id }}>
                  <Card className="h-full shadow-soft transition-shadow hover:shadow-card">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                          {initials(customer.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{customer.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {customer.city ?? "No town saved"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {customer.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3" /> {customer.phone}
                          </span>
                        )}
                        {customer.instagram && (
                          <span className="inline-flex items-center gap-1">
                            <Instagram className="size-3" /> @{customer.instagram}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                        <span className="text-muted-foreground">
                          {stat.count} order{stat.count === 1 ? "" : "s"}
                        </span>
                        <span className="font-semibold">{formatMoney(stat.spend, currency)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <CustomerFormSheet open={formOpen} customer={null} onOpenChange={setFormOpen} />
    </>
  );
}
