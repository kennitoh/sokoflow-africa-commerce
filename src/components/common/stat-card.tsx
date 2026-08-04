import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  icon: LucideIcon;
  className?: string;
};

export function StatCard({ label, value, hint, delta, icon: Icon, className }: StatCardProps) {
  const isPositive = (delta ?? 0) >= 0;
  const DeltaIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className={cn("shadow-soft transition-shadow hover:shadow-card", className)}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <div className="flex items-center gap-2 text-xs">
          {typeof delta === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                isPositive ? "text-success" : "text-destructive",
              )}
            >
              <DeltaIcon className="size-3" />
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="truncate text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
