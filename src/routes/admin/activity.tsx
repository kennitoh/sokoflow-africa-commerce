import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ScrollText } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { TableSkeleton } from "@/components/common/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";
import { adminService } from "@/services/admin.service";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({
    meta: [
      { title: "SokoFlow Ops — Platform activity" },
      {
        name: "description",
        content: "Platform-wide business activity and the internal admin audit trail.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminActivity,
});

function AdminActivity() {
  const activityQuery = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => adminService.platformActivity(),
    staleTime: 15_000,
  });

  const auditQuery = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => adminService.auditLog(),
    staleTime: 15_000,
  });

  const activity = activityQuery.data ?? [];
  const audit = auditQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Activity"
        description="What businesses are doing on SokoFlow, plus a record of every internal admin action."
        breadcrumbs={[{ label: "Ops", to: "/admin" }, { label: "Activity" }]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityQuery.isLoading && <TableSkeleton rows={6} columns={2} />}
            {activityQuery.isError && (
              <ErrorState error={activityQuery.error} onRetry={() => activityQuery.refetch()} />
            )}
            {activityQuery.data && activity.length === 0 && (
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="Once businesses start creating orders and products, their activity shows up here."
              />
            )}
            {activity.length > 0 && (
              <ul className="divide-y divide-border">
                {activity.map((entry) => (
                  <li key={entry.id} className="space-y-0.5 py-3">
                    <p className="text-sm">{entry.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.business_user_id ? (
                        <Link
                          to="/admin/businesses/$businessId"
                          params={{ businessId: entry.business_user_id }}
                          className="hover:underline"
                        >
                          {entry.business_name || "Unnamed business"}
                        </Link>
                      ) : (
                        (entry.business_name ?? "Unnamed business")
                      )}{" "}
                      · {timeAgo(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Admin audit trail</CardTitle>
          </CardHeader>
          <CardContent>
            {auditQuery.isLoading && <TableSkeleton rows={6} columns={2} />}
            {auditQuery.isError && (
              <ErrorState error={auditQuery.error} onRetry={() => auditQuery.refetch()} />
            )}
            {auditQuery.data && audit.length === 0 && (
              <EmptyState
                icon={ScrollText}
                title="No admin actions yet"
                description="Every status change and support note logged by the team appears here."
              />
            )}
            {audit.length > 0 && (
              <ul className="divide-y divide-border">
                {audit.map((entry) => (
                  <li key={entry.id} className="space-y-0.5 py-3">
                    <p className="text-sm font-medium">
                      {entry.action.toLowerCase().replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.admin_name || "Admin"} · {entry.target_business || "Platform"} ·{" "}
                      {timeAgo(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
