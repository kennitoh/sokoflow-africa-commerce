import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { adminService } from "@/services/admin.service";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();
  const adminQuery = useQuery({
    queryKey: ["admin", "is-admin", user?.id],
    queryFn: () => adminService.isAdmin(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  if (adminQuery.isLoading || !user) {
    return <LoadingState label="Checking your access" className="min-h-screen" />;
  }

  if (adminQuery.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <ErrorState error={adminQuery.error} onRetry={() => adminQuery.refetch()} />
      </div>
    );
  }

  if (!adminQuery.data) return <AccessDenied />;

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        role="alert"
        className="max-w-md space-y-4 rounded-2xl border border-border bg-card px-6 py-10 text-center"
      >
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-5" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            This area is for the SokoFlow team only. Your account doesn't have internal access, and
            no business data is available here.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link to="/home">Back to my workspace</Link>
        </Button>
      </div>
    </div>
  );
}
