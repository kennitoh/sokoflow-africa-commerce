import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { customerService } from "@/services/customer.service";
import type { Customer } from "@/types";

type CustomerFormSheetProps = {
  open: boolean;
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
};

export function CustomerFormSheet({ open, customer, onOpenChange }: CustomerFormSheetProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => emptyValues());

  useEffect(() => {
    if (!open) return;
    setValues(
      customer
        ? {
            name: customer.name,
            phone: customer.phone ?? "",
            whatsapp: customer.whatsapp ?? "",
            instagram: customer.instagram ?? "",
            email: customer.email ?? "",
            address: customer.address ?? "",
            city: customer.city ?? "",
            notes: customer.notes ?? "",
          }
        : emptyValues(),
    );
  }, [open, customer]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        whatsapp: values.whatsapp.trim() || null,
        instagram: values.instagram.trim().replace(/^@/, "") || null,
        email: values.email.trim() || null,
        address: values.address.trim() || null,
        city: values.city.trim() || null,
        notes: values.notes.trim() || null,
      };
      return customer ? customerService.update(customer.id, payload) : customerService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (customer) queryClient.invalidateQueries({ queryKey: ["customer", customer.id] });
      toast.success(customer ? "Customer updated" : "Customer added");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save this customer"),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 sm:px-6">
          <SheetTitle className="text-lg">{customer ? "Edit customer" : "Add customer"}</SheetTitle>
          <SheetDescription className="text-xs">
            Keep phone, WhatsApp and Instagram in one place.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          <Field label="Full name">
            <Input
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              placeholder="Amina Wanjiru"
              className="h-11 rounded-xl"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={values.phone}
                onChange={(event) => setValues({ ...values, phone: event.target.value })}
                placeholder="07…"
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={values.whatsapp}
                onChange={(event) => setValues({ ...values, whatsapp: event.target.value })}
                placeholder="07…"
                className="h-11 rounded-xl"
              />
            </Field>
          </div>
          <Field label="Instagram username">
            <Input
              value={values.instagram}
              onChange={(event) => setValues({ ...values, instagram: event.target.value })}
              placeholder="@username"
              className="h-11 rounded-xl"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={values.email}
              onChange={(event) => setValues({ ...values, email: event.target.value })}
              placeholder="name@email.com"
              className="h-11 rounded-xl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Delivery address">
              <Input
                value={values.address}
                onChange={(event) => setValues({ ...values, address: event.target.value })}
                placeholder="Estate, street, house"
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="City / town">
              <Input
                value={values.city}
                onChange={(event) => setValues({ ...values, city: event.target.value })}
                placeholder="Nairobi"
                className="h-11 rounded-xl"
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={values.notes}
              onChange={(event) => setValues({ ...values, notes: event.target.value })}
              placeholder="Prefers size M, pays on delivery…"
              className="min-h-20 rounded-xl"
            />
          </Field>
        </div>

        <div className="border-t border-border bg-card px-4 py-4 sm:px-6">
          <Button
            className="h-12 w-full rounded-xl text-base"
            disabled={!values.name.trim() || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {customer ? "Save changes" : "Add customer"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function emptyValues() {
  return {
    name: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    email: "",
    address: "",
    city: "",
    notes: "",
  };
}
