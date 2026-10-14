import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/features/storefront/storefront-cart";
import { getOrderConfirmation, type OrderConfirmation } from "@/services/storefront.functions";

export const Route = createFileRoute("/order/$token")({
  loader: async ({ params }) => {
    const order = await getOrderConfirmation({ data: { token: params.token } });
    if (!order) throw notFound();
    return order;
  },
  head: () => ({
    meta: [
      { title: "Order received — SokoFlow" },
      { name: "description", content: "Your order has been sent to the business." },
      { property: "og:title", content: "Order received" },
      { property: "og:description", content: "Your order has been sent to the business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationPage,
  notFoundComponent: () => <Centered title="Order not found" body="This confirmation link isn't valid." />,
  errorComponent: ({ reset }) => (
    <Centered title="We couldn't load your order" body="Please check your connection and try again.">
      <Button onClick={reset}>Try again</Button>
    </Centered>
  ),
});

function ConfirmationPage() {
  const order = Route.useLoaderData() as OrderConfirmation;
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight">Order received</h1>
          <p className="text-sm text-muted-foreground">
            {order.business_name} has received your order and will contact you to confirm it.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-semibold">{order.order_number}</span>
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-3 py-2.5 text-sm">
                  <span>{i.quantity} × {i.name}</span>
                  <span className="shrink-0">{money(Number(i.total), order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{money(Number(order.total), order.currency)}</span>
            </div>
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Payment is still pending. The business will tell you how to pay. Keep this page link for your records.
            </p>
          </CardContent>
        </Card>
        {order.slug && (
          <Button asChild variant="outline" className="w-full">
            <Link to="/s/$slug" params={{ slug: order.slug }}>Back to {order.business_name}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Centered({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div className="space-y-3">
        <Store className="mx-auto size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
        {children}
      </div>
    </div>
  );
}
