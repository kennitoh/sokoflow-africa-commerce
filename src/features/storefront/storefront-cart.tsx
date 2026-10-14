import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { SmartImage } from "@/components/common/smart-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { submitCheckout, type PublicProduct } from "@/services/storefront.functions";

export type CartLines = Record<string, number>;

export function useCart(slug: string) {
  const storageKey = `sokoflow-cart:${slug}`;
  const [lines, setLines] = useState<CartLines>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLines(JSON.parse(raw) as CartLines);
    } catch {
      /* ignore */
    }
  }, [storageKey]);
  const update = (next: CartLines) => {
    setLines(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  return {
    lines,
    set: (id: string, qty: number) => {
      const next = { ...lines };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, 999);
      update(next);
    },
    clear: () => update({}),
  };
}

export function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  currency: string;
  products: PublicProduct[];
  cart: ReturnType<typeof useCart>;
};

export function CartSheet({ open, onOpenChange, slug, currency, products, cart }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"cart" | "details">("cart");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", fulfillment: "delivery" as "delivery" | "collection", address: "", note: "" });
  // One key per checkout attempt: retries of the same cart reuse it, so the server never creates a second order.
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const items = Object.entries(cart.lines)
    .map(([id, qty]) => ({ product: byId.get(id), qty }))
    .filter((l): l is { product: PublicProduct; qty: number } => Boolean(l.product));
  const unavailable = items.filter((l) => !l.product.in_stock);
  const subtotal = items.reduce((s, l) => s + Number(l.product.price) * l.qty, 0);

  const changeQty = (id: string, qty: number) => {
    cart.set(id, qty);
    setIdemKey(crypto.randomUUID());
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (form.name.trim().length < 2) return setError("Please enter your name.");
    if (form.phone.replace(/\D/g, "").length < 7) return setError("Please enter a valid phone number.");
    if (form.fulfillment === "delivery" && form.address.trim().length < 5) return setError("Please enter a delivery address.");
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitCheckout({
        data: {
          slug,
          idempotencyKey: idemKey,
          customer: form,
          items: items.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      cart.clear();
      onOpenChange(false);
      void navigate({ to: "/order/$token", params: { token: res.token } });
    } catch {
      setError("Connection problem — your cart is saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setStep("cart"); }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{step === "cart" ? "Your order" : "Your details"}</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <ShoppingBag className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">Add products to start an order.</p>
          </div>
        ) : step === "cart" ? (
          <div className="flex flex-1 flex-col">
            <ul className="flex-1 divide-y divide-border">
              {items.map(({ product, qty }) => (
                <li key={product.id} className="flex gap-3 p-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-border">
                    <SmartImage bucket="product-images" value={product.image_url} alt={product.name} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
                      <p className="shrink-0 text-sm font-semibold">{money(Number(product.price) * qty, currency)}</p>
                    </div>
                    {!product.in_stock && <p className="text-xs font-medium text-destructive">Out of stock — please remove</p>}
                    <div className="flex items-center gap-2">
                      <Button type="button" size="icon" variant="outline" className="size-8" aria-label="Decrease" onClick={() => changeQty(product.id, qty - 1)}>
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
                      <Button type="button" size="icon" variant="outline" className="size-8" aria-label="Increase" onClick={() => changeQty(product.id, qty + 1)}>
                        <Plus className="size-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="ml-auto size-8" aria-label="Remove" onClick={() => changeQty(product.id, 0)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-border p-5">
              <Totals subtotal={subtotal} currency={currency} />
              <Button className="w-full" size="lg" disabled={unavailable.length > 0} onClick={() => setStep("details")}>
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-1 flex-col">
            <div className="flex-1 space-y-4 p-5">
              <Field label="Full name" id="co-name">
                <Input id="co-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </Field>
              <Field label="Phone number" id="co-phone">
                <Input id="co-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={25} />
              </Field>
              <Field label="Email (optional)" id="co-email">
                <Input id="co-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} />
              </Field>
              <div className="space-y-1.5">
                <Label>How would you like to receive it?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["delivery", "collection"] as const).map((m) => (
                    <Button key={m} type="button" variant={form.fulfillment === m ? "default" : "outline"} onClick={() => setForm({ ...form, fulfillment: m })}>
                      {m === "delivery" ? "Delivery" : "I'll collect"}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">The business will contact you to confirm delivery or collection details and any fees.</p>
              </div>
              {form.fulfillment === "delivery" && (
                <Field label="Delivery address" id="co-address">
                  <Textarea id="co-address" autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} maxLength={500} />
                </Field>
              )}
              <Field label="Note for the business (optional)" id="co-note">
                <Textarea id="co-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} maxLength={1000} />
              </Field>
            </div>
            <div className="space-y-3 border-t border-border p-5">
              <Totals subtotal={subtotal} currency={currency} />
              <p className="text-xs text-muted-foreground">No payment is taken now. The business will confirm your order and how to pay.</p>
              {error && <p role="alert" className="rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("cart")} disabled={submitting}>Back</Button>
                <Button type="submit" className="flex-1" size="lg" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" />} Place order
                </Button>
              </div>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Totals({ subtotal, currency }: { subtotal: number; currency: string }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(subtotal, currency)}</span></div>
      <div className="flex justify-between font-semibold"><span>Total</span><span>{money(subtotal, currency)}</span></div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
