import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LineChart as LineChartIcon, Plus } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewOrder } from "@/features/orders/new-order-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatCompactMoney, formatMoney, localDateKey } from "@/lib/format";
import { customerService } from "@/services/customer.service";
import { orderService } from "@/services/order.service";
import { productService } from "@/services/product.service";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — SokoFlow" },
      {
        name: "description",
        content:
          "Revenue, order trends, best selling products and top customers — the numbers behind your week.",
      },
      { property: "og:title", content: "Insights — SokoFlow" },
      { property: "og:description", content: "Revenue, trends, best products and top customers." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { currency } = useWorkspace();
  const { openNewOrder } = useNewOrder();

  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: orderService.list });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: productService.list });
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: customerService.list });

  const orders = (ordersQuery.data ?? []).filter((order) => order.status !== "cancelled");
  const orderIds = orders.map((order) => order.id);

  const itemsQuery = useQuery({
    queryKey: ["order-items", orderIds.join(",")],
    queryFn: () => orderService.items(orderIds),
    enabled: orderIds.length > 0,
  });

  const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const collected = orders.reduce((sum, order) => sum + Number(order.amount_paid), 0);
  const average = orders.length > 0 ? revenue / orders.length : 0;

  const trend = useMemo(() => {
    const days: { day: string; revenue: number; orders: number }[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = localDateKey(date);
      const dayOrders = orders.filter((order) => localDateKey(new Date(order.created_at)) === key);
      days.push({
        day: date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        revenue: dayOrders.reduce((sum, order) => sum + Number(order.total), 0),
        orders: dayOrders.length,
      });
    }
    return days;
  }, [orders]);

  const bestProducts = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    for (const item of itemsQuery.data ?? []) {
      const current = map.get(item.product_name) ?? { name: item.product_name, units: 0, revenue: 0 };
      map.set(item.product_name, {
        name: item.product_name,
        units: current.units + item.quantity,
        revenue: current.revenue + Number(item.total),
      });
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [itemsQuery.data]);

  const topCustomers = useMemo(() => {
    const names = new Map((customersQuery.data ?? []).map((customer) => [customer.id, customer.name]));
    const map = new Map<string, { name: string; spend: number; orders: number }>();
    for (const order of orders) {
      const key = order.customer_id ?? order.customer_name ?? "Walk-in";
      const name = order.customer_id ? (names.get(order.customer_id) ?? "Customer") : key;
      const current = map.get(key) ?? { name, spend: 0, orders: 0 };
      map.set(key, { name, spend: current.spend + Number(order.total), orders: current.orders + 1 });
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend).slice(0, 6);
  }, [orders, customersQuery.data]);

  const lowStock = (productsQuery.data ?? []).filter(
    (product) => product.stock <= product.low_stock_threshold,
  );

  if (ordersQuery.isError) {
    return (
      <div className="animate-page-in">
        <ErrorState error={ordersQuery.error} onRetry={() => ordersQuery.refetch()} />
      </div>
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="animate-page-in space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-page-in space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Insights</h1>
        <p className="text-sm text-muted-foreground">
          The numbers live here so your Home page stays about today's work.
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          icon={LineChartIcon}
          title="Analytics will appear once you start selling."
          description="Insights fill in automatically once you start recording orders. Take a few sales in Orders and come back to see revenue, best sellers and your top customers."
          action={
            <Button size="sm" onClick={openNewOrder}>
              <Plus className="size-4" /> New order
            </Button>
          }
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Revenue" value={formatMoney(revenue, currency)} />
            <Metric label="Collected" value={formatMoney(collected, currency)} />
            <Metric label="Orders" value={String(orders.length)} />
            <Metric label="Average order" value={formatMoney(average, currency)} />
          </section>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-base font-semibold">Revenue — last 14 days</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(value: number) => formatCompactMoney(value, currency)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatMoney(value, currency)}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.75rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-base font-semibold">Orders per day</h2>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.75rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Bar dataKey="orders" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="text-base font-semibold">Best selling products</h2>
                {bestProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add products to your orders to see what sells best.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {bestProducts.map((product) => (
                      <li key={product.name} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{product.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {product.units} sold
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold">
                          {formatMoney(product.revenue, currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="text-base font-semibold">Top customers</h2>
                <ul className="divide-y divide-border">
                  {topCustomers.map((customer) => (
                    <li key={customer.name} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{customer.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {customer.orders} order{customer.orders === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatMoney(customer.spend, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-base font-semibold">Inventory watchlist</h2>
              {lowStock.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Stock levels are healthy — nothing is below its alert level.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {lowStock.map((product) => (
                    <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="truncate text-sm font-medium">{product.name}</span>
                      <span className="shrink-0 text-sm font-semibold text-destructive">
                        {product.stock} left
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="space-y-1 p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="truncate text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
