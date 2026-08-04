import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

import { ModulePage } from "@/components/common/module-page";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Orders — SokoFlow" },
      { name: "description", content: "Track every sale from placed to paid to fulfilled." },
      { property: "og:title", content: "Orders — SokoFlow" },
      { property: "og:description", content: "Track sales from placed to fulfilled in SokoFlow." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <ModulePage
      title="Orders"
      description="Every sale in one place — from placed to paid to delivered."
      icon={ShoppingCart}
      createLabel="New order"
      searchPlaceholder="Search by order number or customer…"
      emptyTitle="No orders yet"
      emptyDescription="When a customer buys from you, the order appears here with its payment and fulfilment status."
    />
  );
}
