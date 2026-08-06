import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const { needsOnboarding } = useWorkspace();
  const onOnboarding = pathname.startsWith("/onboarding");

  if (onOnboarding) return <Outlet />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
