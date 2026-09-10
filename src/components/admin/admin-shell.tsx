import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Building2, LayoutDashboard, LifeBuoy, ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNav = [
  { title: "Overview", to: "/admin", icon: LayoutDashboard },
  { title: "Businesses", to: "/admin/businesses", icon: Building2 },
  { title: "Support", to: "/admin/support", icon: LifeBuoy },
  { title: "Activity", to: "/admin/activity", icon: Activity },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (router) => router.location.pathname });

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <Link to="/admin" className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <ShieldCheck className="size-4" />
            </span>
            <span className="truncate text-sm font-semibold">SokoFlow Ops</span>
          </Link>
          <Badge variant="outline" className="shrink-0 rounded-full font-mono text-[10px]">
            BETA
          </Badge>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="hidden rounded-lg sm:inline-flex">
              <Link to="/home">Merchant app</Link>
            </Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <nav
          aria-label="Admin sections"
          className="mx-auto flex w-full max-w-[1600px] gap-1 overflow-x-auto px-2 pb-1 sm:px-5"
        >
          {adminNav.map((item) => {
            const active =
              item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-8">{children}</div>
      </main>
    </div>
  );
}
