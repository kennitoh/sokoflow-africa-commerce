import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Clock3,
  MoonStar,
  Package,
  ShoppingCart,
  TriangleAlert,
  Users,
} from "lucide-react";

import { MetricCard, MetricSkeletonGrid } from "@/components/admin/admin-bits";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { adminService } from "@/services/admin.service";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "SokoFlow Ops — Beta overview" },
      { name: "description", content: "Internal SokoFlow operations console: beta health, business activation and platform usage." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const metricsQuery = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => adminService.metrics(),
    staleTime: 30_000,
  });

  const noFirstOrderQuery = useQuery({
    queryKey: ["admin", "no-first-order"],
    queryFn: () => adminService.listBusinesses({ sort: "created", limit: 100 }),
    staleTime: 30_000,
  });

  const metrics = metricsQuery.data;
  const target = metrics?.beta?.target_businesses ?? 10;
  const withoutFirstOrder = (noFirstOrderQuery.data?.rows ?? []).filter((row) => row.orders === 0);

  return (
    <>
      <PageHeader
        title="Beta overview"
        description="How the SokoFlow beta is actually being used — activation, usage and businesses that may need support."
        actions={
          <Badge variant="secondary" className="rounded-full">
            Free Beta · {metrics?.businesses.total ?? "—"} / {target} businesses
          </Badge>
        }
      />

      {metricsQuery.isLoading && <MetricSkeletonGrid />}
      {metricsQuery.isError && (
        <ErrorState error={metricsQuery.error} onRetry={() => metricsQuery.refetch()} />
      )}

      {metrics && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Total businesses"
              value={metrics.businesses.total}
              hint={`${metrics.businesses.beta_plan} on free beta`}
              icon={Building2}
            />
            <MetricCard
              label="Active"
              value={metrics.businesses.active}
              hint={`Active in last ${metrics.thresholds.healthy_days} days`}
              icon={CheckCircle2}
            />
            <MetricCard
              label="Onboarding"
              value={metrics.businesses.onboarding}
              hint="Setup not finished"
              icon={Clock3}
            />
            <MetricCard
              label="Needs attention"
              value={metrics.businesses.needs_attention}
              hint="No first order or going quiet"
              icon={TriangleAlert}
            />
            <MetricCard
              label="Inactive"
              value={metrics.businesses.inactive}
              hint={`No activity for ${metrics.thresholds.inactive_days}+ days`}
              icon={MoonStar}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-soft lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activation funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <FunnelRow
                  label="Registered"
                  value={metrics.businesses.total}
                  total={metrics.businesses.total}
                />
                <FunnelRow
                  label="Onboarding completed"
                  value={metrics.businesses.onboarding_completed}
                  total={metrics.businesses.total}
                  rate={metrics.rates.onboarding_completion}
                />
                <FunnelRow
                  label="Created a first order"
                  value={metrics.businesses.with_first_order}
                  total={metrics.businesses.total}
                  rate={metrics.rates.first_order_conversion}
                />
                <FunnelRow
                  label="More than one order"
                  value={metrics.businesses.multiple_orders}
                  total={metrics.businesses.total}
                />
                <p className="text-xs text-muted-foreground">
                  First-order conversion among onboarded businesses:{" "}
                  <span className="font-semibold text-foreground">
                    {metrics.rates.first_order_conversion_onboarded}%
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Returning businesses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <RetentionRow label="Active last 24 hours" value={metrics.retention.day1} />
                <RetentionRow label="Active last 7 days" value={metrics.retention.day7} />
                <RetentionRow label="Active last 30 days" value={metrics.retention.day30} />
                <p className="pt-1 text-xs text-muted-foreground">
                  {metrics.rates.active_percentage}% of all businesses are currently active.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Products" value={metrics.usage.products} icon={Package} />
            <MetricCard label="Customers" value={metrics.usage.customers} icon={Users} />
            <MetricCard label="Orders" value={metrics.usage.orders} icon={ShoppingCart} />
            <MetricCard label="Orders this week" value={metrics.usage.orders_week} />
            <MetricCard label="Orders this month" value={metrics.usage.orders_month} />
          </section>
        </>
      )}

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Businesses with no first order</CardTitle>
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link to="/admin/businesses">All businesses</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {noFirstOrderQuery.isLoading && <MetricSkeletonGrid count={3} />}
          {noFirstOrderQuery.isError && (
            <ErrorState
              error={noFirstOrderQuery.error}
              onRetry={() => noFirstOrderQuery.refetch()}
            />
          )}
          {noFirstOrderQuery.data && withoutFirstOrder.length === 0 && (
            <EmptyState
              icon={CheckCircle2}
              title="Every business has created an order"
              description="All businesses on the beta have made it past their first order."
            />
          )}
          {withoutFirstOrder.length > 0 && (
            <ul className="divide-y divide-border">
              {withoutFirstOrder.slice(0, 8).map((row) => (
                <li key={row.user_id} className="flex flex-wrap items-center gap-2 py-3">
                  <Link
                    to="/admin/businesses/$businessId"
                    params={{ businessId: row.user_id }}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {row.business_name || row.owner_email || "Unnamed business"}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {row.products} products · {row.customers} customers
                  </span>
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {row.onboarding_completed ? "Onboarded" : "Onboarding"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function FunnelRow({
  label,
  value,
  total,
  rate,
}: {
  label: string;
  value: number;
  total: number;
  rate?: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value} / {total}
          {typeof rate === "number" && <span className="ml-2 text-foreground">{rate}%</span>}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function RetentionRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
