import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Mail, MessageCircle, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { HealthPill, MetricCard, StatusPillText } from "@/components/admin/admin-bits";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, timeAgo } from "@/lib/format";
import { adminService } from "@/services/admin.service";
import { ADMIN_ACCOUNT_STATUSES, ADMIN_ISSUE_CATEGORIES } from "@/types/admin";

export const Route = createFileRoute("/admin/businesses/$businessId")({
  head: () => ({
    meta: [
      { title: "SokoFlow Ops — Business detail" },
      {
        name: "description",
        content: "Internal view of one business: setup progress, usage, health and support notes.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBusinessDetailPage,
});

function AdminBusinessDetailPage() {
  const { businessId } = Route.useParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueCategory, setIssueCategory] = useState<string>("other");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueNote, setIssueNote] = useState("");

  const detailQuery = useQuery({
    queryKey: ["admin", "business", businessId],
    queryFn: () => adminService.businessDetail(businessId),
  });

  const business = detailQuery.data?.business;

  useEffect(() => {
    if (business?.account_status) setStatus(business.account_status);
  }, [business?.account_status]);

  useEffect(() => {
    void adminService.logView(businessId);
  }, [businessId]);

  const statusMutation = useMutation({
    mutationFn: (next: string) => adminService.updateAccountStatus(businessId, next),
    onSuccess: () => {
      toast.success("Account status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const issueMutation = useMutation({
    mutationFn: () =>
      adminService.createIssue({
        userId: businessId,
        title: issueTitle.trim(),
        category: issueCategory,
        description: issueDescription.trim(),
        internalNote: issueNote.trim(),
      }),
    onSuccess: () => {
      toast.success("Support issue logged");
      setIssueTitle("");
      setIssueDescription("");
      setIssueNote("");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (detailQuery.isLoading) return <LoadingState label="Loading business" />;
  if (detailQuery.isError)
    return <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} />;
  if (!business)
    return (
      <EmptyState
        icon={Activity}
        title="Business not found"
        description="This business may have been removed."
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/admin/businesses">Back to businesses</Link>
          </Button>
        }
      />
    );

  const currency = business.currency || "KES";
  const issues = detailQuery.data?.issues ?? [];
  const activity = detailQuery.data?.activity ?? [];

  return (
    <>
      <PageHeader
        title={business.business_name || "Unnamed business"}
        description={[business.business_type, business.city, business.country]
          .filter(Boolean)
          .join(" · ")}
        breadcrumbs={[
          { label: "Ops", to: "/admin" },
          { label: "Businesses", to: "/admin/businesses" },
          { label: business.business_name || "Business" },
        ]}
        actions={<HealthPill health={business.health} />}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Products" value={business.products} />
        <MetricCard label="Customers" value={business.customers} />
        <MetricCard
          label="Orders"
          value={business.orders}
          hint={`${business.orders_week} this week`}
        />
        <MetricCard
          label="Order value"
          value={formatMoney(business.order_value, currency)}
          hint={`${formatMoney(business.outstanding, currency)} outstanding`}
        />
      </section>

      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
            {[
              { label: "Account created", done: true },
              { label: "Onboarding", done: business.onboarding_completed },
              { label: "Profile", done: business.profile_completion >= 80 },
              { label: "Products", done: business.products > 0 },
              { label: "Customers", done: business.customers > 0 },
              { label: "First order", done: Boolean(business.first_order_at) },
              { label: "Repeat use", done: Boolean(business.returned_after_first_order) },
            ].map((step) => (
              <li
                key={step.label}
                className={
                  step.done
                    ? "flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-primary"
                    : "flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
                }
              >
                <span aria-hidden>{step.done ? "✓" : "✗"}</span>
                {step.label}
                <span className="sr-only">{step.done ? "done" : "not yet"}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Owner and setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Owner" value={business.owner_name} />
              <Field label="Email" value={business.owner_email} />
              <Field label="Phone" value={business.owner_phone} />
              <Field label="Currency" value={currency} />
              <Field label="Joined" value={new Date(business.created_at).toLocaleDateString()} />
              <Field label="Last active" value={timeAgo(business.last_active_at)} />
              <Field
                label="First order"
                value={business.first_order_at ? timeAgo(business.first_order_at) : "Not yet"}
              />
              <Field
                label="Came back after first order"
                value={business.returned_after_first_order ? "Yes" : "Not yet"}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Profile completeness</span>
                <span className="tabular-nums text-muted-foreground">
                  {business.profile_completion}%
                </span>
              </div>
              <Progress value={business.profile_completion} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Onboarding {business.onboarding_completed ? "completed" : "not finished"}
              </p>
            </div>
            {(business.sales_channels ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(business.sales_channels ?? []).map((channel) => (
                  <Badge key={channel} variant="secondary" className="rounded-full capitalize">
                    {channel.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {business.owner_phone && (
                <Button asChild size="sm" variant="outline" className="rounded-lg">
                  <a href={`tel:${business.owner_phone}`}>
                    <Phone className="size-3.5" /> Call
                  </a>
                </Button>
              )}
              {business.owner_phone && (
                <Button asChild size="sm" variant="outline" className="rounded-lg">
                  <a
                    href={`https://wa.me/${business.owner_phone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-3.5" /> WhatsApp
                  </a>
                </Button>
              )}
              {business.owner_email && (
                <Button asChild size="sm" variant="outline" className="rounded-lg">
                  <a href={`mailto:${business.owner_email}`}>
                    <Mail className="size-3.5" /> Email
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusPillText value={business.account_status} />
              <div className="space-y-1.5">
                <Label htmlFor="account-status">Change status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="account-status" className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_ACCOUNT_STATUSES.map((value) => (
                      <SelectItem key={value} value={value} className="capitalize">
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full rounded-xl"
                disabled={!status || status === business.account_status || statusMutation.isPending}
                onClick={() => statusMutation.mutate(status)}
              >
                {statusMutation.isPending ? "Saving…" : "Update status"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Status changes are recorded in the audit log. Business data is never edited from
                here.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Field label="Plan" value={business.plan} />
              <Field label="Subscription" value={business.subscription_status} />
              <Field label="Billing" value={business.billing_status} />
              <p className="text-xs text-muted-foreground">
                Billing is switched off for the beta — nothing is charged.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Log a support issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="issue-title">Title</Label>
              <Input
                id="issue-title"
                value={issueTitle}
                onChange={(event) => setIssueTitle(event.target.value)}
                placeholder="Owner can't finish onboarding"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-category">Category</Label>
              <Select value={issueCategory} onValueChange={setIssueCategory}>
                <SelectTrigger id="issue-category" className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ISSUE_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value} className="capitalize">
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-description">What happened</Label>
              <Textarea
                id="issue-description"
                value={issueDescription}
                onChange={(event) => setIssueDescription(event.target.value)}
                rows={3}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-note">Internal note</Label>
              <Textarea
                id="issue-note"
                value={issueNote}
                onChange={(event) => setIssueNote(event.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <Button
              className="w-full rounded-xl"
              disabled={!issueTitle.trim() || issueMutation.isPending}
              onClick={() => issueMutation.mutate()}
            >
              {issueMutation.isPending ? "Saving…" : "Log issue"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Support issues</CardTitle>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No issues logged for this business.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {issues.map((issue) => (
                    <li key={issue.id} className="space-y-1 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{issue.title}</span>
                        <StatusPillText value={issue.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {issue.category} · {timeAgo(issue.created_at)}
                      </p>
                      {issue.description && <p className="text-sm">{issue.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex gap-3 text-sm">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{entry.message}</span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(entry.created_at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2 sm:block">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="truncate font-medium capitalize">{value || "—"}</p>
    </div>
  );
}
