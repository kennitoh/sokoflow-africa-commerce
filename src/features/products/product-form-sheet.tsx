import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/common/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { productService } from "@/services/product.service";
import type { Product, ProductStatus } from "@/types";

type ProductFormSheetProps = {
  open: boolean;
  product: Product | null;
  onOpenChange: (open: boolean) => void;
};

const statuses: ProductStatus[] = ["active", "draft", "archived"];

export function ProductFormSheet({ open, product, onOpenChange }: ProductFormSheetProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => emptyValues());
  const [status, setStatus] = useState<ProductStatus>("active");
  const [published, setPublished] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setValues({
        name: product.name,
        category: product.category ?? "",
        sku: product.sku ?? "",
        price: String(product.price ?? ""),
        stock: String(product.stock ?? ""),
        low_stock_threshold: String(product.low_stock_threshold ?? 5),
        image_url: product.image_url ?? "",
        description: product.description ?? "",
      });
      setStatus(product.status);
      setPublished(Boolean(product.published_to_web));
    } else {
      setValues(emptyValues());
      setStatus("active");
      setPublished(false);
    }
    setTouched(false);
  }, [open, product]);

  const nameError = touched && !values.name.trim() ? "Product name is required" : null;
  const price = Number(values.price);
  const priceError = touched && (Number.isNaN(price) || price < 0) ? "Price must be 0 or more" : null;
  const isValid = values.name.trim().length > 0 && !Number.isNaN(price) && price >= 0;

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        name: values.name.trim(),
        category: values.category.trim() || null,
        sku: values.sku.trim() || null,
        description: values.description.trim() || null,
        image_url: values.image_url.trim() || null,
        price: Number(values.price) || 0,
        low_stock_threshold: Number(values.low_stock_threshold) || 5,
        status,
        published_to_web: published,
      };
      const stock = Number(values.stock) || 0;
      if (!product) return productService.create({ ...base, stock });
      const updated = await productService.update(product.id, base);
      // A stock edit becomes one atomic adjustment so a movement is always recorded.
      const delta = stock - (Number(product.stock) || 0);
      if (delta !== 0) await productService.adjustStock(product, delta, "Edited in product form");
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(product ? "Product updated" : "Product added");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save this product"),
  });

  function handleSave() {
    setTouched(true);
    if (!isValid) return;
    save.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 sm:px-6">
          <SheetTitle className="text-lg">{product ? "Quick edit" : "Add product"}</SheetTitle>
          <SheetDescription className="text-xs">
            Name, price and stock are all you need to start selling.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          <Field label="Product name" error={nameError}>
            <Input
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              placeholder="Linen shirt — cream"
              className={cn("h-11 rounded-xl", nameError && "border-destructive")}
              autoFocus
              aria-invalid={Boolean(nameError)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price" error={priceError}>
              <Input
                inputMode="decimal"
                value={values.price}
                onChange={(event) => setValues({ ...values, price: event.target.value })}
                placeholder="0"
                className={cn("h-11 rounded-xl", priceError && "border-destructive")}
                aria-invalid={Boolean(priceError)}
              />
            </Field>
            <Field label="Stock">
              <Input
                inputMode="numeric"
                value={values.stock}
                onChange={(event) => setValues({ ...values, stock: event.target.value })}
                placeholder="0"
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Category">
              <Input
                value={values.category}
                onChange={(event) => setValues({ ...values, category: event.target.value })}
                placeholder="Dresses"
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Alert below">
              <Input
                inputMode="numeric"
                value={values.low_stock_threshold}
                onChange={(event) =>
                  setValues({ ...values, low_stock_threshold: event.target.value })
                }
                placeholder="5"
                className="h-11 rounded-xl"
              />
            </Field>
          </div>
          <Field label="SKU (optional)">
            <Input
              value={values.sku}
              onChange={(event) => setValues({ ...values, sku: event.target.value })}
              placeholder="SHIRT-CRM-M"
              className="h-11 rounded-xl"
            />
          </Field>
          <ImageUpload
            bucket="product-images"
            shape="wide"
            label="Product image (optional)"
            alt={values.name.trim() || "Product image"}
            value={values.image_url || null}
            onChange={(value) => setValues({ ...values, image_url: value ?? "" })}
          />
          <Field label="Description (optional)">
            <Textarea
              value={values.description}
              onChange={(event) => setValues({ ...values, description: event.target.value })}
              placeholder="Fabric, sizing, care notes…"
              className="min-h-20 rounded-xl"
            />
          </Field>
          <Field label="Status">
            <div className="grid grid-cols-3 gap-2">
              {statuses.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition-colors",
                    status === option
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">Show on public page</span>
              <span className="block text-xs text-muted-foreground">
                Visible to anyone with your business link while it is active and your page is published. Cost and stock stay private.
              </span>
            </span>
            <Switch checked={published} onCheckedChange={setPublished} aria-label="Show on public page" />
          </label>
        </div>

        <div className="border-t border-border bg-card px-4 py-4 sm:px-6">
          <Button
            className="h-12 w-full rounded-xl text-base"
            disabled={save.isPending}
            onClick={handleSave}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {product ? "Save changes" : "Add product"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function emptyValues() {
  return {
    name: "",
    category: "",
    sku: "",
    price: "",
    stock: "",
    low_stock_threshold: "5",
    image_url: "",
    description: "",
  };
}
