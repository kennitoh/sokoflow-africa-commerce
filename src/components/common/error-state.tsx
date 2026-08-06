import { AlertTriangle, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorKind = "network" | "permission" | "unexpected";

function classify(error: unknown): ErrorKind {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "");
  if (!message) return "unexpected";
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("timeout")
  ) {
    return "network";
  }
  if (
    message.includes("permission") ||
    message.includes("not authorized") ||
    message.includes("jwt") ||
    message.includes("row-level security")
  ) {
    return "permission";
  }
  return "unexpected";
}

const copy: Record<ErrorKind, { icon: typeof AlertTriangle; title: string; description: string }> = {
  network: {
    icon: WifiOff,
    title: "You appear to be offline",
    description:
      "We couldn't reach SokoFlow. Check your connection or mobile data, then try loading this again.",
  },
  permission: {
    icon: ShieldAlert,
    title: "You don't have access to this",
    description:
      "Your session may have expired. Sign in again and this will load with your own business data.",
  },
  unexpected: {
    icon: AlertTriangle,
    title: "Something went wrong",
    description:
      "This didn't load as expected. Trying again usually fixes it — nothing in your business data was changed.",
  },
};

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const { icon: Icon, title, description } = copy[classify(error)];

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" className="rounded-lg" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}
