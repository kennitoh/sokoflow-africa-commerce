import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { primaryNav } from "@/config/navigation";
import { formatMoney } from "@/lib/format";
import { customerService } from "@/services/customer.service";
import { orderService } from "@/services/order.service";
import { productService } from "@/services/product.service";

const RESULT_LIMIT = 6;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: customerService.list,
    enabled: open,
  });
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: productService.list,
    enabled: open,
  });
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: orderService.list,
    enabled: open,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const customers = useMemo(() => customersQuery.data?.slice(0, RESULT_LIMIT) ?? [], [customersQuery.data]);
  const products = useMemo(() => productsQuery.data?.slice(0, RESULT_LIMIT) ?? [], [productsQuery.data]);
  const orders = useMemo(() => ordersQuery.data?.slice(0, RESULT_LIMIT) ?? [], [ordersQuery.data]);

  function go(to: string, params?: Record<string, string>) {
    setOpen(false);
    navigate(params ? { to, params } : { to });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/60 md:max-w-md"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search orders, products, customers…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, orders, products, customers…" />
        <CommandList>
          <CommandEmpty>No matches — try a customer name, product or order number.</CommandEmpty>
          <CommandGroup heading="Pages">
            {primaryNav.map((item) => (
              <CommandItem
                key={item.url}
                value={`page ${item.title}`}
                onSelect={() => go(item.url)}
              >
                <item.icon className="size-4" />
                <span>{item.title}</span>
                {item.description && (
                  <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          {customers.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Customers">
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`customer ${customer.name} ${customer.phone ?? ""} ${customer.instagram ?? ""} ${customer.city ?? ""}`}
                    onSelect={() => go("/customers/$customerId", { customerId: customer.id })}
                  >
                    <span className="truncate">{customer.name}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {customer.phone ?? customer.city ?? customer.instagram ?? ""}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {products.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Products">
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`product ${product.name} ${product.sku ?? ""} ${product.category ?? ""}`}
                    onSelect={() => go("/products")}
                  >
                    <span className="truncate">{product.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {formatMoney(product.price)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {orders.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Orders">
                {orders.map((order) => (
                  <CommandItem
                    key={order.id}
                    value={`order ${order.order_number} ${order.customer_name}`}
                    onSelect={() => go("/orders")}
                  >
                    <span className="truncate">
                      #{order.order_number} · {order.customer_name}
                    </span>
                    <span className="ml-auto shrink-0 text-xs capitalize text-muted-foreground">
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>Navigate results with ↑ ↓, select with ↵</span>
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </div>
      </CommandDialog>
    </>
  );
}
