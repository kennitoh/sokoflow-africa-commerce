import type { LucideIcon } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AdminHealth } from "@/types/admin";
import { ADMIN_HEALTH_LABEL } from "@/types/admin";
import type { StatusTone } from "@/types";

const healthTone: Record<AdminHealth, StatusTone> = {
  healthy: "success",
  needs_attention: "warning",
  onboarding: "info",
  inactive: "neutral",
  suspended: "danger",
};

export function HealthPill({ health }: { health: AdminHealth }) {
  return <StatusPill tone={healthTone[health]}>{ADMIN_HEALTH_LABEL[health]}</StatusPill>;
}

export function StatusPillText({ value }: { value: string }) {
  const tone: StatusTone =
    value === "active"
      ? "success"
      : value === "suspended"
        ? "danger"
        : value === "onboarding" || value === "invited"
          ? "info"
          : value === "inactive"
            ? "warning"
            : "neutral";
  return (
    <StatusPill tone={tone} className="capitalize">
      {value.replace(/_/g, " ")}
    </StatusPill>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardContent className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
        </div>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function MetricSkeletonGrid({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
