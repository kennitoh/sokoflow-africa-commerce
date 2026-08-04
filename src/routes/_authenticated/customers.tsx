import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { ModulePage } from "@/components/common/module-page";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — SokoFlow" },
      { name: "description", content: "Know who buys from you, how often and what they need next." },
      { property: "og:title", content: "Customers — SokoFlow" },
      { property: "og:description", content: "Manage buyer relationships in SokoFlow." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <ModulePage
      title="Customers"
      description="Relationships, contact details and buying history in one view."
      icon={Users}
      createLabel="Add customer"
      searchPlaceholder="Search customers by name, phone or email…"
      emptyTitle="No customers yet"
      emptyDescription="Add customers manually or let them be created automatically from your first orders."
    />
  );
}
