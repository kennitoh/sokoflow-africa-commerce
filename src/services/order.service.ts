import { supabase } from "@/integrations/supabase/client";
import { activityService } from "@/services/activity.service";
import type {
  NewOrderInput,
  Order,
  OrderItem,
  OrderStatus,
  OrderWithItems,
  PaymentStatus,
} from "@/types";

const SELECT =
  "id, order_number, customer_id, customer_name, status, payment_status, channel, subtotal, discount, delivery_fee, total, amount_paid, delivery_address, delivery_date, notes, created_at";

const ITEM_SELECT =
  "id, order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, total";

export const orderService = {
  async list(): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Order[];
  },

  async items(orderIds: string[]): Promise<OrderItem[]> {
    if (orderIds.length === 0) return [];
    const { data, error } = await supabase.from("order_items").select(ITEM_SELECT).in("order_id", orderIds);
    if (error) throw error;
    return (data ?? []) as OrderItem[];
  },

  async get(id: string): Promise<OrderWithItems | null> {
    const { data, error } = await supabase.from("orders").select(SELECT).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const items = await orderService.items([id]);
    return { ...(data as Order), items };
  },

  async byCustomer(customerId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Order[];
  },

  // Atomic: order + items + stock + movements + activity happen in one transaction
  // inside the `create_order` database function. Never do these steps separately.
  async create(input: NewOrderInput): Promise<Order> {
    const { data, error } = await supabase.rpc("create_order", {
      p_order: {
        customer_id: input.customer_id,
        customer_name: input.customer_name,
        channel: input.channel,
        status: input.status,
        payment_status: input.payment_status,
        discount: input.discount,
        delivery_fee: input.delivery_fee,
        amount_paid: input.amount_paid,
        delivery_address: input.delivery_address,
        delivery_date: input.delivery_date,
        notes: input.notes,
      },
      p_items: input.lines.map((line) => ({
        product_id: line.product_id,
        variant_id: line.variant_id,
        product_name: line.product_name,
        variant_name: line.variant_name,
        unit_price: line.unit_price,
        quantity: line.quantity,
      })),
    });
    if (error) throw new Error(cleanDbError(error.message));
    return data as unknown as Order;
  },

  async cancel(id: string): Promise<Order> {
    const { data, error } = await supabase.rpc("cancel_order", { p_order_id: id });
    if (error) throw new Error(cleanDbError(error.message));
    return data as unknown as Order;
  },

  async updateStatus(ids: string[], status: OrderStatus) {
    if (status === "cancelled") {
      // Cancellation restores stock exactly once — must go through the RPC.
      for (const id of ids) await orderService.cancel(id);
      return;
    }
    const { error } = await supabase.from("orders").update({ status }).in("id", ids);
    if (error) throw error;
    await activityService.log({
      entity_type: "order",
      entity_id: ids.length === 1 ? (ids[0] ?? null) : null,
      action: `status_${status}`,
      message:
        ids.length === 1
          ? `Order marked as ${status.replace(/_/g, " ")}`
          : `${ids.length} orders marked as ${status.replace(/_/g, " ")}`,
    });
  },

  /**
   * The database is the source of truth: a trigger validates
   * 0 <= amount_paid <= total and derives payment_status from the money.
   * We send our best guess so optimistic UI matches, then refetch.
   */
  async updatePaymentAmount(id: string, amountPaid: number, total: number) {
    const clamped = Math.min(Math.max(amountPaid, 0), total);
    const derived: PaymentStatus =
      clamped <= 0 ? "unpaid" : clamped >= total ? "paid" : "partial";
    const { data, error } = await supabase
      .from("orders")
      .update({ amount_paid: clamped, payment_status: derived })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error(cleanDbError(error.message));
    const saved = data as Order;
    await activityService.log({
      entity_type: "order",
      entity_id: id,
      action: `payment_${saved.payment_status}`,
      message: `Payment updated — ${saved.payment_status} (${Number(saved.amount_paid)} of ${Number(saved.total)})`,
    });
    return saved;
  },

  async markRefunded(id: string) {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "refunded" })
      .eq("id", id);
    if (error) throw new Error(cleanDbError(error.message));
    await activityService.log({
      entity_type: "order",
      entity_id: id,
      action: "payment_refunded",
      message: "Payment marked as refunded",
    });
  },

  async updateDelivery(id: string, values: { delivery_date?: string | null; delivery_address?: string | null }) {
    const { error } = await supabase.from("orders").update(values).eq("id", id);
    if (error) throw new Error(cleanDbError(error.message));
    await activityService.log({
      entity_type: "order",
      entity_id: id,
      action: "delivery_updated",
      message:
        values.delivery_date === null
          ? "Delivery date cleared"
          : values.delivery_date
            ? `Delivery date set to ${values.delivery_date}`
            : "Delivery details updated",
    });
  },

  async updateNotes(id: string, notes: string) {
    const { error } = await supabase.from("orders").update({ notes }).eq("id", id);
    if (error) throw error;
    await activityService.log({
      entity_type: "order",
      entity_id: id,
      action: "notes_updated",
      message: "Internal notes updated",
    });
  },
};


function cleanDbError(message: string) {
  return message.replace(/^ERROR:\s*/i, "").trim() || "Something went wrong";
}
