import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Copy,
  LayoutGrid,
  List,
  MoreVertical,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { SmartImage } from "@/components/common/smart-image";
import { StatusPill } from "@/components/common/status-pill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
type SortKey = "newest" | "name" | "price-desc" | "stock-asc";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "name", label: "Name A–Z" },
  { key: "price-desc", label: "Price high→low" },
  { key: "stock-asc", label: "Stock low→high" },
];

function ProductsPage() {
  const { currency } = useWorkspace();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("grid");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const productsQuery = useQuery({ queryKey: ["products"], queryFn: productService.list });
  const products = productsQuery.data ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = products.filter((product) => {
      if (filter === "active" && product.status !== "active") return false;
      if (filter === "draft" && product.status !== "draft") return false;
      if (filter === "low" && !isLowStock(product)) return false;
      if (!needle) return true;
      return [product.name, product.sku, product.category]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle));
    });
    const sorted = [...list];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price-desc":
        sorted.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "stock-asc":
        sorted.sort((a, b) => a.stock - b.stock);
        break;
      default:
        sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return sorted;
  }, [products, filter, query, sort]);

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

  async function duplicate(product: Product) {
    setBusyId(product.id);
    try {
      await productService.duplicate(product);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product duplicated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not duplicate this product");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleArchive(product: Product) {
    setBusyId(product.id);
    const nextStatus = product.status === "archived" ? "active" : "archived";
    try {
      await productService.update(product.id, { status: nextStatus });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(nextStatus === "archived" ? "Product archived" : "Product restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this product");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await productService.remove(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this product");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
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

      <div className="animate-page-in space-y-4">
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
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-48" aria-label="Sort products">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          view === "table" ? (
            <Card className="hidden overflow-hidden sm:block">
              <CardContent className="p-4">
                <TableSkeleton />
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, index) => (
                <li key={index}>
                  <Card className="overflow-hidden">
                    <Skeleton className="aspect-[4/3] w-full rounded-none" />
                    <CardContent className="space-y-3 p-4">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-9 w-full rounded-lg" />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )
        ) : productsQuery.isError ? (
          <ErrorState error={productsQuery.error} onRetry={() => productsQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={products.length === 0 ? "Let's add your first product." : "Nothing matches this view"}
            description={
              products.length === 0
                ? "Products power fast order entry and low-stock alerts. Add an item with a price and a stock count, and SokoFlow keeps everything in step automatically."
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
                    <TableHead className="text-right text-xs uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <SmartImage
                              bucket="product-images"
                              value={product.image_url}
                              alt={product.name}
                              fallbackIcon={Package}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate">{product.name}</p>
                            {product.sku && (
                              <span className="block text-xs text-muted-foreground">{product.sku}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.category ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
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
                          <StockBadge product={product} />
                        </div>
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
                        <ProductActionsMenu
                          product={product}
                          disabled={busyId === product.id}
                          onEdit={() => openEdit(product)}
                          onDuplicate={() => duplicate(product)}
                          onToggleArchive={() => toggleArchive(product)}
                          onDelete={() => setDeleteTarget(product)}
                        />
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
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    <SmartImage
                      bucket="product-images"
                      value={product.image_url}
                      alt={product.name}
                      fallbackIcon={Package}
                    />
                    <div className="absolute top-2 right-2">
                      <ProductActionsMenu
                        product={product}
                        disabled={busyId === product.id}
                        onEdit={() => openEdit(product)}
                        onDuplicate={() => duplicate(product)}
                        onToggleArchive={() => toggleArchive(product)}
                        onDelete={() => setDeleteTarget(product)}
                        surface
                      />
                    </div>
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill tone={isLowStock(product) ? "warning" : "success"}>
                          {product.stock} in stock
                        </StatusPill>
                        <StockBadge product={product} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-10 rounded-lg sm:size-8"
                          aria-label={`Reduce stock of ${product.name}`}
                          disabled={busyId === product.id}
                          onClick={() => adjust(product, -1)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-10 rounded-lg sm:size-8"
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
                      onClick={() => openEdit(product)}
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

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the product from your catalogue. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StockBadge({ product }: { product: Product }) {
  if (product.stock === 0) {
    return <StatusPill tone="danger">Out of stock</StatusPill>;
  }
  if (isLowStock(product)) {
    return (
      <StatusPill tone="warning">
        <AlertTriangle className="size-3" aria-hidden /> Low stock
      </StatusPill>
    );
  }
  return null;
}

function ProductActionsMenu({
  product,
  disabled,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
  surface = false,
}: {
  product: Product;
  disabled: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  surface?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant={surface ? "secondary" : "outline"}
          className="size-10 rounded-lg sm:size-8"
          aria-label={`More actions for ${product.name}`}
          disabled={disabled}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-3.5" /> Quick edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="size-3.5" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleArchive}>
          <Package className="size-3.5" /> {product.status === "archived" ? "Restore" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="size-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}
