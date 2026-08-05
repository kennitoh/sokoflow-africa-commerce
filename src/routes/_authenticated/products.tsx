import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Loader2, Minus, Package, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductFormSheet } from "@/features/products/product-form-sheet";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isLowStock, productService } from "@/services/product.service";
import type { Product } from "@/types";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products & stock — SokoFlow" },
      {
        name: "description",
        content:
          "Your catalogue and stock levels together: prices, categories, low-stock alerts and one-tap quick edits.",
      },
      { property: "og:title", content: "Products & stock — SokoFlow" },
      { property: "og:description", content: "Catalogue and inventory in one simple place." },
    ],
  }),
  component: ProductsPage,
});

type View = "grid" | "table";
type Filter = "all" | "active" | "low" | "draft";

function ProductsPage() {
  const { currency } = useWorkspace();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("grid");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const productsQuery = useQuery({ queryKey: ["products"], queryFn: productService.list });
  const products = productsQuery.data ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (filter === "active" && product.status !== "active") return false;
      if (filter === "draft" && product.status !== "draft") return false;
      if (filter === "low" && !isLowStock(product)) return false;
      if (!needle) return true;
      return [product.name, product.sku, product.category]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle));
    });
  }, [products, filter, query]);

  async function adjust(product: Product, change: number) {
    setBusyId(product.id);
    try {
      await productService.adjustStock(product, change);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update stock");
    } finally {
      setBusyId(null);
    }
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${products.length}` },
    { key: "active", label: "Active" },
    { key: "low", label: `Low stock ${products.filter(isLowStock).length}` },
    { key: "draft", label: "Drafts" },
  ];

  return (
    <>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">Products</h1>
          <p className="text-sm text-muted-foreground">
            Catalogue and stock levels in one place — no separate inventory screen.
          </p>
        </div>
        <Button onClick={openNew} className="shrink-0 rounded-xl">
          <Plus className="size-4" /> Add product
        </Button>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products by name, SKU or category…"
              aria-label="Search products"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <div className="hidden shrink-0 items-center gap-1 rounded-xl border border-border p-1 sm:flex">
            <Button
              size="icon"
              variant={view === "grid" ? "secondary" : "ghost"}
              aria-label="Card view"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={view === "table" ? "secondary" : "ghost"}
              aria-label="Table view"
              onClick={() => setView("table")}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-1.5">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                  filter === item.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {productsQuery.isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={products.length === 0 ? "Your catalogue is empty" : "Nothing matches this view"}
            description={
              products.length === 0
                ? "Add the items you sell with a price and a stock count. SokoFlow then keeps stock in step with every order and warns you before you run out."
                : "Try a different search, or switch back to All products."
            }
            action={
              products.length === 0 ? (
                <Button size="sm" onClick={openNew}>
                  <Plus className="size-4" /> Add your first product
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setFilter("all"); setQuery(""); }}>
                  Reset filters
                </Button>
              )
            }
          />
        ) : view === "table" ? (
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase">Product</TableHead>
                    <TableHead className="text-xs uppercase">Category</TableHead>
                    <TableHead className="text-xs uppercase">Status</TableHead>
                    <TableHead className="text-right text-xs uppercase">Stock</TableHead>
                    <TableHead className="text-right text-xs uppercase">Price</TableHead>
                    <TableHead className="text-right text-xs uppercase">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="text-sm font-medium">
                        {product.name}
                        {product.sku && (
                          <span className="block text-xs text-muted-foreground">{product.sku}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.category ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusPill
                          tone={
                            product.status === "active"
                              ? "success"
                              : product.status === "draft"
                                ? "neutral"
                                : "danger"
                          }
                        >
                          <span className="capitalize">{product.status}</span>
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={cn(isLowStock(product) && "font-semibold text-destructive")}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatMoney(Number(product.price), currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            setEditing(product);
                            setFormOpen(true);
                          }}
                        >
                          Quick edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => (
              <li key={product.id}>
                <Card className="h-full overflow-hidden shadow-soft transition-shadow hover:shadow-card">
                  <div className="aspect-[4/3] w-full bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground">
                        <Package className="size-7" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.category ?? "Uncategorised"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold">
                        {formatMoney(Number(product.price), currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill tone={isLowStock(product) ? "warning" : "success"}>
                        {product.stock} in stock
                      </StatusPill>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-lg"
                          aria-label={`Reduce stock of ${product.name}`}
                          disabled={busyId === product.id}
                          onClick={() => adjust(product, -1)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-lg"
                          aria-label={`Add stock to ${product.name}`}
                          disabled={busyId === product.id}
                          onClick={() => adjust(product, 1)}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-lg"
                      onClick={() => {
                        setEditing(product);
                        setFormOpen(true);
                      }}
                    >
                      Quick edit
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProductFormSheet open={formOpen} product={editing} onOpenChange={setFormOpen} />
    </>
  );
}
