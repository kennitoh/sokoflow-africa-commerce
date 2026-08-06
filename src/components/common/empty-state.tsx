import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  /** Why the page is empty and why the feature matters. */
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-page-in relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-primary-soft opacity-60 blur-3xl"
      />
      <div className="relative grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary shadow-soft">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="relative space-y-1.5">
        <p className="text-base font-semibold">{title}</p>
        {description && (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="relative flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
