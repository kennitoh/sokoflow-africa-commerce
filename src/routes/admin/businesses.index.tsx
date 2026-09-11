import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useState } from "react";

import { HealthPill, StatusPillText } from "@/components/admin/admin-bits";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchBar } from "@/components/common/search-bar";
import { TableSkeleton } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timeAgo } from "@/lib/format";
import { adminService } from "@/services/admin.service";
import { ADMIN_ACCOUNT_STATUSES } from "@/types/admin";

export const Route = createFileRoute("/admin/businesses/")({
  head: () => ({
    meta: [
      { title: "SokoFlow Ops — Business directory" },
      {
        name: "description",
        content: "Search, filter and monitor every business using SokoFlow during the beta.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBusinesses,
});

const PAGE_SIZE = 25;

function AdminBusinesses() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [onboarding, setOnboarding] = useState("all");
  const [health, setHealth] = useState("all");
  const [sort, setSort] = useState("last_active");
  const [page, setPage] = useState(0);

  const listQuery = useQuery({
    queryKey: ["admin", "businesses", { search, status, onboarding, health, sort, page }],
    queryFn: () =>
      adminService.listBusinesses({
        search,
        status,
        onboarding,
        health,
        sort,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const rows = listQuery.data?.rows ?? [];
  const total = listQuery.data?.total ?? 0;
  const lastPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0);

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(0);
      setter(value);
    };
  }

  return (
    <>
      <PageHeader
        title="Businesses"
        description="Every business on SokoFlow with its setup progress, usage and last activity."
        breadcrumbs={[{ label: "Ops", to: "/admin" }, { label: "Businesses" }]}
      />

      <Card className="shadow-soft">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
            <SearchBar
              value={search}
              onValueChange={resetPage(setSearch)}
              placeholder="Search business, owner, email or phone…"
            />
            <FilterSelect
              label="Account status"
              value={status}
              onChange={resetPage(setStatus)}
              options={[
                { value: "all", label: "All statuses" },
                ...ADMIN_ACCOUNT_STATUSES.map((value) => ({
                  value,
                  label: value.charAt(0).toUpperCase() + value.slice(1),
                })),
              ]}
            />
            <FilterSelect
              label="Onboarding"
              value={onboarding}
              onChange={resetPage(setOnboarding)}
              options={[
                { value: "all", label: "All onboarding" },
                { value: "completed", label: "Completed" },
                { value: "incomplete", label: "Incomplete" },
              ]}
            />
            <FilterSelect
              label="Health"
              value={health}
              onChange={resetPage(setHealth)}
              options={[
                { value: "all", label: "All health" },
                { value: "healthy", label: "Healthy" },
                { value: "needs_attention", label: "Needs attention" },
                { value: "onboarding", label: "Onboarding" },
                { value: "inactive", label: "Inactive" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
            <FilterSelect
              label="Sort by"
              value={sort}
              onChange={resetPage(setSort)}
              options={[
                { value: "last_active", label: "Last active" },
                { value: "created", label: "Newest" },
                { value: "orders", label: "Most orders" },
                { value: "name", label: "Name" },
              ]}
            />
          </div>

          {listQuery.isLoading && <TableSkeleton rows={6} columns={5} />}
          {listQuery.isError && (
            <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} />
          )}

          {listQuery.data && rows.length === 0 && (
            <EmptyState
              icon={Building2}
              title="No businesses match this view"
              description="Try clearing the filters or searching for a different business or owner."
            />
          )}

          {rows.length > 0 && (
            <>
              {/* Mobile list */}
              <ul className="space-y-2 lg:hidden">
                {rows.map((row) => (
                  <li key={row.user_id}>
                    <Link
                      to="/admin/businesses/$businessId"
                      params={{ businessId: row.user_id }}
                      className="block rounded-xl border border-border p-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {row.business_name || "Unnamed business"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.owner_name || row.owner_email || "—"}
                          </p>
                        </div>
                        <HealthPill health={row.health} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                        <span>{row.products} products</span>
                        <span>{row.customers} customers</span>
                        <span>{row.orders} orders</span>
                        <span>Active {timeAgo(row.last_active_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Onboarding</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Customers</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell className="max-w-56">
                          <Link
                            to="/admin/businesses/$businessId"
                            params={{ businessId: row.user_id }}
                            className="block min-w-0"
                          >
                            <span className="block truncate font-medium hover:underline">
                              {row.business_name || "Unnamed business"}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {row.owner_name || row.owner_email || "—"}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusPillText value={row.account_status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.onboarding_completed ? "Completed" : "Incomplete"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.products}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.customers}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {timeAgo(row.last_active_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <HealthPill health={row.health} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                <span>
                  Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + rows.length} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={page === 0}
                    onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={page >= lastPage}
                    onClick={() => setPage((current) => Math.min(current + 1, lastPage))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 rounded-xl" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
