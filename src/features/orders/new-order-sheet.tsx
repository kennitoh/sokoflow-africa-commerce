import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Minus, Plus, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { channelMeta, paymentStatusMeta, sellableChannels } from "@/features/orders/order-status";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatMoney, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { customerService } from "@/services/customer.service";
import { orderService } from "@/services/order.service";
import { productService } from "@/services/product.service";
import type { Customer, NewOrderLine, PaymentStatus, Product, SalesChannel } from "@/types";

type NewOrderSheetProps = { open: boolean; onOpenChange: (open: boolean) => void };

export function NewOrderSheet({ open, onOpenChange }: NewOrderSheetProps) {
  const { currency } = useWorkspace();
  const queryClient = useQueryClient();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [productQuery, setProductQuery] = useState("");
  const [lines, setLines] = useState<NewOrderLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [channel, setChannel] = useState<SalesChannel>("whatsapp");
  const [payment, setPayment] = useState<PaymentStatus>("unpaid");
  const [notes, setNotes] = useState("");

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

  const customerMatches = useMemo(() => {
    const list = customersQuery.data ?? [];
    if (!customerQuery.trim()) return list.slice(0, 5);
    const needle = customerQuery.toLowerCase();
    return list
      .filter((item) =>
        [item.name, item.phone, item.whatsapp, item.instagram]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(needle)),
      )
      .slice(0, 6);
  }, [customersQuery.data, customerQuery]);

  const productMatches = useMemo(() => {
    const list = (productsQuery.data ?? []).filter((item) => item.status !== "archived");
    if (!productQuery.trim()) return list.slice(0, 5);
    const needle = productQuery.toLowerCase();
    return list
      .filter((item) =>
        [item.name, item.sku, item.category]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(needle)),
      )
      .slice(0, 8);
  }, [productsQuery.data, productQuery]);

  const subtotal = lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const total = Math.max(0, subtotal - toNumber(discount) + toNumber(deliveryFee));
  const buyerName = customer?.name || walkInName.trim() || customerQuery.trim();

  function reset() {
    setCustomerQuery("");
    setCustomer(null);
    setWalkInName("");
    setNewCustomerPhone("");
    setCreatingCustomer(false);
    setProductQuery("");
    setLines([]);
    setDiscount("");
    setDeliveryFee("");
    setChannel("whatsapp");
    setPayment("unpaid");
    setNotes("");
  }

  function addProduct(product: Product) {
    setLines((previous) => {
      const existing = previous.find((line) => line.product_id === product.id);
      if (existing) {
        return previous.map((line) =>
          line.product_id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...previous,
        {
          product_id: product.id,
          variant_id: null,
          product_name: product.name,
          variant_name: null,
          unit_price: Number(product.price),
          quantity: 1,
        },
      ];
    });
    setProductQuery("");
  }

  function changeQuantity(index: number, delta: number) {
    setLines((previous) =>
      previous
        .map((line, position) =>
          position === index ? { ...line, quantity: line.quantity + delta } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  const createCustomer = useMutation({
    mutationFn: () =>
      customerService.create({
        name: customerQuery.trim() || walkInName.trim(),
        phone: newCustomerPhone.trim() || null,
        whatsapp: newCustomerPhone.trim() || null,
      }),
    onSuccess: (created) => {
      setCustomer(created);
      setCustomerQuery(created.name);
      setCreatingCustomer(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`${created.name} added`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not add that customer"),
  });

  const saveOrder = useMutation({
    mutationFn: () =>
      orderService.create({
        customer_id: customer?.id ?? null,
        customer_name: buyerName || "Walk-in customer",
        channel,
        status: "pending",
        payment_status: payment,
        discount: toNumber(discount),
        delivery_fee: toNumber(deliveryFee),
        amount_paid: payment === "paid" ? total : 0,
        delivery_address: customer?.address ?? null,
        delivery_date: null,
        notes: notes.trim() || null,
        lines,
      }),
    onSuccess: (order) => {
      toast.success(`Order ${order.order_number} saved`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      reset();
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save this order"),
  });

  const canSave = lines.length > 0 && Boolean(buyerName);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-b border-border px-4 py-4 sm:px-6">
          <SheetTitle className="text-lg">New order</SheetTitle>
          <SheetDescription className="text-xs">
            Customer, items, payment — done in a few taps.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          {/* CUSTOMER */}
          <section className="space-y-3">
            <Label className="text-xs tracking-wide uppercase">Customer</Label>
            {customer ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {initials(customer.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {customer.phone || customer.whatsapp || customer.instagram || "No contact yet"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Change customer"
                  onClick={() => {
                    setCustomer(null);
                    setCustomerQuery("");
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    placeholder="Search name, phone or Instagram…"
                    className="h-11 rounded-xl pl-9"
                    autoFocus
                  />
                </div>
                {customerMatches.length > 0 && (
                  <ul className="overflow-hidden rounded-xl border border-border">
                    {customerMatches.map((match) => (
                      <li key={match.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomer(match);
                            setCustomerQuery(match.name);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
                            {initials(match.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{match.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {match.phone || match.instagram || "No contact"}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {creatingCustomer ? (
                  <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
                    <Input
                      value={customerQuery}
                      onChange={(event) => setCustomerQuery(event.target.value)}
                      placeholder="Customer name"
                      className="h-10 rounded-lg"
                    />
                    <Input
                      value={newCustomerPhone}
                      onChange={(event) => setNewCustomerPhone(event.target.value)}
                      placeholder="Phone / WhatsApp"
                      className="h-10 rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={!customerQuery.trim() || createCustomer.isPending}
                        onClick={() => createCustomer.mutate()}
                      >
                        {createCustomer.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        Save customer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setCreatingCustomer(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreatingCustomer(true)}
                    >
                      <UserPlus className="size-4" /> New customer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setWalkInName("Walk-in customer")}
                    >
                      Walk-in sale
                    </Button>
                  </div>
                )}
                {walkInName && !customer && (
                  <p className="text-xs text-muted-foreground">
                    Saving as <span className="font-medium text-foreground">{walkInName}</span>
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ITEMS */}
          <section className="space-y-3">
            <Label className="text-xs tracking-wide uppercase">Items</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Search products to add…"
                className="h-11 rounded-xl pl-9"
              />
            </div>
            {productQuery.trim() && (
              <ul className="overflow-hidden rounded-xl border border-border">
                {productMatches.length === 0 && (
                  <li className="px-3 py-3 text-xs text-muted-foreground">
                    No product matches. Add it in Products first.
                  </li>
                )}
                {productMatches.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {product.stock} in stock
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatMoney(Number(product.price), currency)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                No items yet. Search above to add what the customer is buying.
              </p>
            ) : (
              <ul className="space-y-2">
                {lines.map((line, index) => (
                  <li
                    key={`${line.product_id}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(line.unit_price, currency)} each
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg"
                        aria-label="Reduce quantity"
                        onClick={() => changeQuantity(index, -1)}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-7 text-center text-sm font-semibold">{line.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-lg"
                        aria-label="Increase quantity"
                        onClick={() => changeQuantity(index, 1)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* MONEY */}
          <section className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount" className="text-xs">
                Discount
              </Label>
              <Input
                id="discount"
                inputMode="decimal"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                placeholder="0"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery" className="text-xs">
                Delivery fee
              </Label>
              <Input
                id="delivery"
                inputMode="decimal"
                value={deliveryFee}
                onChange={(event) => setDeliveryFee(event.target.value)}
                placeholder="0"
                className="h-11 rounded-xl"
              />
            </div>
          </section>

          {/* CHANNEL + PAYMENT */}
          <section className="space-y-3">
            <Label className="text-xs tracking-wide uppercase">Sold through</Label>
            <div className="flex flex-wrap gap-2">
              {sellableChannels.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setChannel(option)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    channel === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {channelMeta[option].label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-xs tracking-wide uppercase">Payment</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["unpaid", "partial", "paid"] as PaymentStatus[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPayment(option)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                    payment === option
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {paymentStatusMeta[option].label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">
              Note (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Delivery instructions, colour preference…"
              className="min-h-20 rounded-xl"
            />
          </section>
        </div>

        <div className="space-y-3 border-t border-border bg-card px-4 py-4 sm:px-6">
          {saveOrder.isError && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              {saveOrder.error instanceof Error
                ? saveOrder.error.message
                : "Could not save this order"}
            </p>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {lines.length} item{lines.length === 1 ? "" : "s"} · subtotal{" "}
              {formatMoney(subtotal, currency)}
            </span>
            <span className="text-base font-bold">{formatMoney(total, currency)}</span>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-xl text-base"
            disabled={!canSave || saveOrder.isPending}
            onClick={() => saveOrder.mutate()}
          >
            {saveOrder.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save order
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function toNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
