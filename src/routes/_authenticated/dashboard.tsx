import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Package,
  PackagePlus,
  Plus,
  ShoppingCart,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusPill, orderStatusTone } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SokoFlow" },
      { name: "description", content: "Your business at a glance: revenue, orders, stock and customers." },
      { property: "og:title", content: "Dashboard — SokoFlow" },
      { property: "og:description", content: "Revenue, orders, inventory and customers at a glance." },
    ],
  }),
  component: Dashboard,
});

type RecentOrder = {
  id: string;
  reference: string;
  customer: string;
  total: string;
  status: keyof typeof orderStatusTone;
  placed: string;
};

const recentOrders: RecentOrder[] = [
  { id: "1", reference: "#1042", customer: "Amina Otieno", total: "KES 12,400", status: "paid", placed: "Today, 09:12" },
  { id: "2", reference: "#1041", customer: "Baraka Stores", total: "KES 48,900", status: "pending", placed: "Today, 08:40" },
  { id: "3", reference: "#1040", customer: "Joy Mwangi", total: "KES 3,250", status: "fulfilled", placed: "Yesterday" },
  { id: "4", reference: "#1039", customer: "Tumaini Grocers", total: "KES 22,100", status: "refunded", placed: "Yesterday" },
  { id: "5", reference: "#1038", customer: "Kito Kitchen", total: "KES 8,750", status: "cancelled", placed: "2 days ago" },
];

const orderColumns: DataTableColumn<RecentOrder>[] = [
  { key: "reference", header: "Order", render: (row) => <span className="font-medium">{row.reference}</span> },
  { key: "customer", header: "Customer", render: (row) => row.customer },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill tone={orderStatusTone[row.status]}>{row.status}</StatusPill>,
  },
  { key: "placed", header: "Placed", render: (row) => <span className="text-muted-foreground">{row.placed}</span> },
  { key: "total", header: "Total", align: "right", render: (row) => <span className="font-medium">{row.total}</span> },
];

const lowStock = [
  { id: "1", name: "Sunflower cooking oil 5L", left: 4, threshold: 20 },
  { id: "2", name: "Maize flour 2kg", left: 7, threshold: 40 },
  { id: "3", name: "Bar soap (carton)", left: 2, threshold: 15 },
  { id: "4", name: "Tea leaves 500g", left: 9, threshold: 30 },
];

const activity = [
  { id: "1", text: "Order #1042 was paid by Amina Otieno", time: "12m ago" },
  { id: "2", text: "Sunflower cooking oil 5L dropped below its reorder point", time: "48m ago" },
  { id: "3", text: "New customer Baraka Stores was added", time: "2h ago" },
  { id: "4", text: "12 products were imported into the catalogue", time: "Yesterday" },
];

const quickActions = [
  { label: "New order", icon: Plus, to: "/orders" as const },
  { label: "Add product", icon: PackagePlus, to: "/products" as const },
  { label: "Add customer", icon: UserPlus, to: "/customers" as const },
  { label: "Adjust stock", icon: Boxes, to: "/inventory" as const },
];

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Good morning"
        description="Here's how your business is doing today. Live data appears once you start selling."
        breadcrumbs={[{ label: "SokoFlow", to: "/dashboard" }, { label: "Dashboard" }]}
        actions={
          <Button asChild>
            <Link to="/orders">
              <Plus className="size-4" /> New order
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (30d)" value="KES 1,284,500" delta={12.4} hint="vs last month" icon={CircleDollarSign} />
        <StatCard label="Orders (30d)" value="486" delta={8.1} hint="vs last month" icon={ShoppingCart} />
        <StatCard label="Items in stock" value="3,912" delta={-2.3} hint="across 128 products" icon={Package} />
        <StatCard label="Customers" value="1,204" delta={5.6} hint="42 new this month" icon={Users} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-5">
            <SectionHeader
              title="Recent orders"
              description="The latest five orders across all channels."
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/orders">
                    View all <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              }
            />
            <DataTable columns={orderColumns} rows={recentOrders} getRowId={(row) => row.id} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <SectionHeader title="Quick actions" description="Everyday tasks, one tap away." />
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Button key={action.label} asChild variant="outline" className="h-auto flex-col gap-2 py-4">
                  <Link to={action.to}>
                    <action.icon className="size-4" />
                    <span className="text-xs font-medium">{action.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <SectionHeader
              title="Low stock"
              description="Reorder these before they run out."
              actions={
                <StatusPill tone="warning">
                  <TriangleAlert className="size-3" /> {lowStock.length} items
                </StatusPill>
              }
            />
            <ul className="space-y-4">
              {lowStock.map((item) => (
                <li key={item.id} className="space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.left} / {item.threshold}
                    </span>
                  </div>
                  <Progress value={(item.left / item.threshold) * 100} className="h-1.5" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <SectionHeader title="Recent activity" description="Everything happening in your workspace." />
            <ol className="space-y-4">
              {activity.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm">{entry.text}</p>
                    <p className="text-xs text-muted-foreground">{entry.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
