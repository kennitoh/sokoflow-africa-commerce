import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { StatusTone } from "@/types";

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        success: "border-transparent bg-success/12 text-success",
        warning: "border-transparent bg-warning/18 text-warning-foreground dark:text-warning",
        danger: "border-transparent bg-destructive/12 text-destructive",
        info: "border-transparent bg-info/12 text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type StatusPillProps = VariantProps<typeof pillVariants> & {
  children: React.ReactNode;
  className?: string;
  withDot?: boolean;
};

export function StatusPill({ tone, children, className, withDot = true }: StatusPillProps) {
  return (
    <span className={cn(pillVariants({ tone }), className)}>
      {withDot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export const orderStatusTone: Record<string, StatusTone> = {
  paid: "success",
  fulfilled: "info",
  pending: "warning",
  refunded: "neutral",
  cancelled: "danger",
};
