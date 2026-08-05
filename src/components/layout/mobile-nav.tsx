import { Link, useRouterState } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { mobileNav } from "@/config/navigation";
import { useNewOrder } from "@/features/orders/new-order-context";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const { openNewOrder } = useNewOrder();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {mobileNav.slice(0, 2).map((item) => (
          <NavTab key={item.url} item={item} pathname={pathname} />
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={openNewOrder}
            aria-label="New order"
            className="-mt-5 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-card active:scale-95"
          >
            <Plus className="size-5" />
          </button>
        </div>
        {mobileNav.slice(2).map((item) => (
          <NavTab key={item.url} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function NavTab({
  item,
  pathname,
}: {
  item: (typeof mobileNav)[number];
  pathname: string;
}) {
  const active = pathname === item.url || pathname.startsWith(`${item.url}/`);
  return (
    <Link
      to={item.url}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <item.icon className="size-5" />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
