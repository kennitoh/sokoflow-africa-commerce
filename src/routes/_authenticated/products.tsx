import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";

import { ModulePage } from "@/components/common/module-page";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — SokoFlow" },
      { name: "description", content: "Build a clean product catalogue with prices and variants." },
      { property: "og:title", content: "Products — SokoFlow" },
      { property: "og:description", content: "Build a clean product catalogue in SokoFlow." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <ModulePage
      title="Products"
      description="Your catalogue: prices, variants and everything you sell."
      icon={Package}
      createLabel="Add product"
      searchPlaceholder="Search products by name or SKU…"
      emptyTitle="Your catalogue is empty"
      emptyDescription="Add your first product to start taking orders and tracking stock."
    />
  );
}
