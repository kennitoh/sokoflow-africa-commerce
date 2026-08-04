import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";

import { ModulePage } from "@/components/common/module-page";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — SokoFlow" },
      { name: "description", content: "Stay ahead of stockouts with clear stock levels and reorder points." },
      { property: "og:title", content: "Inventory — SokoFlow" },
      { property: "og:description", content: "Track stock levels and reorder points in SokoFlow." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <ModulePage
      title="Inventory"
      description="Stock levels, reorder points and adjustments across your locations."
      icon={Boxes}
      createLabel="Adjust stock"
      searchPlaceholder="Search stock by product or SKU…"
      emptyTitle="No stock tracked yet"
      emptyDescription="Once products are in your catalogue, their stock levels and low-stock alerts show up here."
    />
  );
}
