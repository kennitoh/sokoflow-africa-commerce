import type { OrderStatus, PaymentStatus, SalesChannel, StatusTone } from "@/types";

export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; tone: StatusTone; nextLabel?: string; next?: OrderStatus }
> = {
  pending: { label: "Pending", tone: "warning", nextLabel: "Confirm", next: "confirmed" },
  confirmed: { label: "Confirmed", tone: "info", nextLabel: "Mark packed", next: "packed" },
  packed: { label: "Packed", tone: "info", nextLabel: "Send out", next: "out_for_delivery" },
  out_for_delivery: {
    label: "Out for delivery",
    tone: "info",
    nextLabel: "Mark delivered",
    next: "delivered",
  },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const orderStatusOrder: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const paymentStatusMeta: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  unpaid: { label: "Unpaid", tone: "danger" },
  partial: { label: "Part paid", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export const channelMeta: Record<SalesChannel, { label: string }> = {
  whatsapp: { label: "WhatsApp" },
  instagram: { label: "Instagram" },
  facebook: { label: "Facebook" },
  tiktok: { label: "TikTok" },
  walk_in: { label: "Walk-in" },
  website: { label: "Website" },
  marketplace: { label: "Marketplace" },
  api: { label: "API" },
};

export const sellableChannels: SalesChannel[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "walk_in",
];
