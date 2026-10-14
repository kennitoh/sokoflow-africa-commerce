import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Music2, Package, Phone, Plus, ShoppingBag, Store } from "lucide-react";

import { SmartImage } from "@/components/common/smart-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CartSheet, useCart } from "@/features/storefront/storefront-cart";
import { getStorefront, type PublicStorefront } from "@/services/storefront.functions";

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }) => {
    const store = await getStorefront({ data: { slug: params.slug } });
    if (!store) throw notFound();
    return store;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Shop` : "Business page unavailable";
    const description =
      loaderData?.description?.slice(0, 155) ??
      (loaderData ? `Browse products from ${loaderData.name}.` : "This business page is not available.");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: StorefrontPage,
  notFoundComponent: StorefrontNotFound,
  errorComponent: ({ reset }) => (
    <Centered title="We couldn't load this page" body="Please check your connection and try again.">
      <Button onClick={reset}>Try again</Button>
    </Centered>
  ),
  pendingComponent: () => <Centered title="Loading…" body="" />,
});

import { money } from "@/features/storefront/storefront-cart";

function waLink(number: string) {
  return `https://wa.me/${number.replace(/[^0-9]/g, "")}`;
}

function StorefrontPage() {
  const store = Route.useLoaderData() as PublicStorefront;
  const cart = useCart(store.slug);
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = Object.values(cart.lines).reduce((a, b) => a + b, 0);
  const location = [store.city, store.country].filter(Boolean).join(", ");
  const contacts = [
    store.whatsapp && { icon: MessageCircle, label: "WhatsApp", href: waLink(store.whatsapp) },
    store.phone && { icon: Phone, label: store.phone, href: `tel:${store.phone}` },
    store.email && { icon: Mail, label: store.email, href: `mailto:${store.email}` },
    store.instagram_url && { icon: Instagram, label: "Instagram", href: ext(store.instagram_url) },
    store.facebook_url && { icon: Facebook, label: "Facebook", href: ext(store.facebook_url) },
    store.tiktok_url && { icon: Music2, label: "TikTok", href: ext(store.tiktok_url) },
  ].filter(Boolean) as { icon: typeof Phone; label: string; href: string }[];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <div className="size-20 shrink-0 overflow-hidden rounded-2xl border border-border">
            <SmartImage bucket="business-logos" value={store.logo_url} alt={store.name} fallbackIcon={Store} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{store.name}</h1>
            {store.description && <p className="max-w-2xl text-sm text-muted-foreground">{store.description}</p>}
            {location && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden /> {location}
              </p>
            )}
            {contacts.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {contacts.map((c) => (
                  <a
                    key={c.href}
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                  >
                    <c.icon className="size-3.5" aria-hidden /> {c.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Products</h2>
        {store.products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <Package className="size-8 text-muted-foreground" aria-hidden />
              <p className="font-medium">No products to show yet</p>
              <p className="text-sm text-muted-foreground">Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {store.products.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <div className="aspect-square">
                  <SmartImage bucket="product-images" value={p.image_url} alt={p.name} />
                </div>
                <CardContent className="space-y-1 p-3 sm:p-4">
                  <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                  <p className="text-sm font-bold text-primary">{money(Number(p.price), store.currency)}</p>
                  {p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  {p.in_stock ? (
                    <Button
                      size="sm"
                      variant={cart.lines[p.id] ? "secondary" : "default"}
                      className="mt-2 w-full"
                      onClick={() => cart.set(p.id, (cart.lines[p.id] ?? 0) + 1)}
                    >
                      <Plus className="size-3.5" /> {cart.lines[p.id] ? `In cart (${cart.lines[p.id]})` : "Add"}
                    </Button>
                  ) : (
                    <p className="mt-2 rounded-md bg-muted py-1.5 text-center text-xs font-medium text-muted-foreground">Out of stock</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur">
          <Button size="lg" className="mx-auto flex w-full max-w-md" onClick={() => setCartOpen(true)}>
            <ShoppingBag className="size-4" /> View order · {cartCount} item{cartCount === 1 ? "" : "s"}
          </Button>
        </div>
      )}
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} slug={store.slug} currency={store.currency} products={store.products} cart={cart} />
      <footer className="py-8 pb-24 text-center text-xs text-muted-foreground">
        Powered by <Link to="/" className="font-semibold hover:underline">SokoFlow</Link>
      </footer>
    </div>
  );
}

function ext(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

function StorefrontNotFound() {
  return <Centered title="This business page isn't available" body="The link may be wrong, or the business hasn't published its page." />;
}

function Centered({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div className="space-y-3">
        <Store className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">{title}</h1>
        {body && <p className="text-sm text-muted-foreground">{body}</p>}
        {children}
      </div>
    </div>
  );
}
