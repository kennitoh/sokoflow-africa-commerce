import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusPillText } from "@/components/admin/admin-bits";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
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
import { timeAgo } from "@/lib/format";
import { adminService } from "@/services/admin.service";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "SokoFlow Ops — Support issues" },
      {
        name: "description",
        content: "Track beta support issues raised for businesses using SokoFlow.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSupport,
});

const NEXT_STATUS: Record<string, string> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "open",
};

const NEXT_LABEL: Record<string, string> = {
  open: "Start work",
  in_progress: "Mark resolved",
  resolved: "Reopen",
};

function AdminSupport() {
  const [status, setStatus] = useState("all");
  const queryClient = useQueryClient();

  const issuesQuery = useQuery({
    queryKey: ["admin", "issues", status],
    queryFn: () => adminService.listIssues(status),
    staleTime: 15_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      adminService.updateIssue(id, next),
    onSuccess: () => {
      toast.success("Issue updated");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const issues = issuesQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Support issues"
        description="Issues the SokoFlow team has logged while supporting beta businesses."
        breadcrumbs={[{ label: "Ops", to: "/admin" }, { label: "Support" }]}
        actions={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-40 rounded-xl" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card className="shadow-soft">
        <CardContent className="p-4">
          {issuesQuery.isLoading && <TableSkeleton rows={5} columns={4} />}
          {issuesQuery.isError && (
            <ErrorState error={issuesQuery.error} onRetry={() => issuesQuery.refetch()} />
          )}
          {issuesQuery.data && issues.length === 0 && (
            <EmptyState
              icon={LifeBuoy}
              title="No support issues here"
              description="Log an issue from a business page when you spot something that needs following up."
              action={
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/admin/businesses">Open businesses</Link>
                </Button>
              }
            />
          )}
          {issues.length > 0 && (
            <ul className="divide-y divide-border">
              {issues.map((issue) => (
                <li key={issue.id} className="space-y-2 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{issue.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <Link
                          to="/admin/businesses/$businessId"
                          params={{ businessId: issue.business_user_id }}
                          className="hover:underline"
                        >
                          {issue.business_name || "Unnamed business"}
                        </Link>{" "}
                        · {issue.category} · {timeAgo(issue.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPillText value={issue.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            id: issue.id,
                            next: NEXT_STATUS[issue.status] ?? "open",
                          })
                        }
                      >
                        {NEXT_LABEL[issue.status] ?? "Update"}
                      </Button>
                    </div>
                  </div>
                  {issue.description && <p className="text-sm">{issue.description}</p>}
                  {issue.internal_note && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      Internal note: {issue.internal_note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
