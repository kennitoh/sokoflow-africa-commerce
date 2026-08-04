import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; to?: string };

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
};

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="space-y-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {crumb.to ? (
                  <Link to={crumb.to} className="transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <ChevronRight className="size-3" />}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground sm:max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
