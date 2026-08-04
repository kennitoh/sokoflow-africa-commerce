import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BRAND } from "@/config/navigation";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-primary p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 text-primary-foreground">
          <span className="grid size-9 place-items-center rounded-xl bg-primary-foreground/15 text-sm font-bold">
            SF
          </span>
          <span className="text-base font-bold">{BRAND.name}</span>
        </Link>
        <div className="space-y-4 text-primary-foreground">
          <h2 className="text-3xl leading-tight font-bold">
            The commerce operating system for African businesses.
          </h2>
          <p className="max-w-sm text-sm text-primary-foreground/80">{BRAND.tagline}</p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>One workspace for products, orders, customers and stock.</li>
            <li>Built to be fast on any device, even on mobile data.</li>
            <li>Set up in minutes, no training required.</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} {BRAND.name}
        </p>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 lg:invisible">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              SF
            </span>
            <span className="text-sm font-bold">{BRAND.name}</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
            {footer && <div className="text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
