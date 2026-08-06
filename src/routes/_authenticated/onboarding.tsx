import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Facebook,
  Instagram,
  Loader2,
  MessageCircle,
  Music2,
  Store,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/common/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { profileService } from "@/services/profile.service";
import { storeService } from "@/services/store.service";
import type { SalesChannelKey } from "@/types";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — SokoFlow" },
      {
        name: "description",
        content:
          "Two minutes of setup: your business name, where you sell and your currency. Then you're ready to take orders.",
      },
      { property: "og:title", content: "Set up your business — SokoFlow" },
      { property: "og:description", content: "A two-minute setup before your first order." },
    ],
  }),
  component: OnboardingPage,
});

const businessTypes = [
  "Fashion & apparel",
  "Beauty & cosmetics",
  "Food & groceries",
  "Electronics",
  "Home & living",
  "Health & wellness",
  "Crafts & gifts",
  "Other retail",
];

const countries = [
  { name: "Kenya", currency: "KES", dial: "+254" },
  { name: "Uganda", currency: "UGX", dial: "+256" },
  { name: "Tanzania", currency: "TZS", dial: "+255" },
  { name: "Nigeria", currency: "NGN", dial: "+234" },
  { name: "Ghana", currency: "GHS", dial: "+233" },
  { name: "Rwanda", currency: "RWF", dial: "+250" },
  { name: "South Africa", currency: "ZAR", dial: "+27" },
];

const channels: { key: SalesChannelKey; label: string; icon: typeof Instagram }[] = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "tiktok", label: "TikTok", icon: Music2 },
  { key: "physical_store", label: "Physical store", icon: Store },
];

const STEPS = ["Business", "Location", "Channels"] as const;

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    business_name: "",
    business_type: "",
    logo_url: null as string | null,
    phone: "",
    country: "Kenya",
    currency: "KES",
    address: "",
    description: "",
  });
  const [selected, setSelected] = useState<SalesChannelKey[]>(["whatsapp"]);

  const finish = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Please sign in again.");
      const profile = await profileService.upsert({
        id: user.id,
        full_name: (user.user_metadata?.["full_name"] as string | undefined) ?? null,
        business_name: values.business_name.trim(),
        business_type: values.business_type || null,
        logo_url: values.logo_url,
        phone: values.phone.trim() || null,
        whatsapp: selected.includes("whatsapp") ? values.phone.trim() || null : null,
        email: user.email ?? null,
        country: values.country,
        currency: values.currency,
        address: values.address.trim() || null,
        description: values.description.trim() || null,
        sales_channels: selected,
        onboarding_completed: true,
      });
      await storeService.ensure({
        name: profile.business_name || "My store",
        channels: selected,
        country: values.country,
      });
      return profile;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("You're all set — welcome to SokoFlow");
      navigate({ to: "/home" });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save your setup"),
  });

  const canContinue = step === 0 ? values.business_name.trim().length > 1 : true;

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    finish.mutate();
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-xl space-y-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Building2 className="size-6" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Let's set up your business</h1>
          <p className="text-sm text-muted-foreground">
            Under two minutes. You can change any of this later in Settings.
          </p>
          <ol className="flex items-center justify-center gap-2" aria-label="Setup progress">
            {STEPS.map((label, index) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                    index === step
                      ? "bg-primary text-primary-foreground"
                      : index < step
                        ? "bg-primary-soft text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                  aria-current={index === step ? "step" : undefined}
                >
                  {index < step ? <Check className="size-3" aria-hidden /> : null}
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </header>

        <div className="animate-page-in surface-card space-y-5 p-5 sm:p-6" key={step}>
          {step === 0 && (
            <>
              <Field label="Business name" htmlFor="business_name">
                <Input
                  id="business_name"
                  value={values.business_name}
                  onChange={(event) =>
                    setValues({ ...values, business_name: event.target.value })
                  }
                  placeholder="Soko Fresh Boutique"
                  className="h-11 rounded-xl"
                  autoFocus
                />
              </Field>

              <div className="space-y-1.5">
                <Label className="text-xs">Business type</Label>
                <div className="flex flex-wrap gap-2">
                  {businessTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValues({ ...values, business_type: type })}
                      aria-pressed={values.business_type === type}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                        values.business_type === type
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <ImageUpload
                bucket="business-logos"
                value={values.logo_url}
                onChange={(logo_url) => setValues({ ...values, logo_url })}
                label="Business logo (optional)"
                hint="Used across your workspace and receipts."
                alt="Business logo"
                shape="square"
              />
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <div className="flex flex-wrap gap-2">
                  {countries.map((country) => (
                    <button
                      key={country.name}
                      type="button"
                      onClick={() =>
                        setValues({
                          ...values,
                          country: country.name,
                          currency: country.currency,
                        })
                      }
                      aria-pressed={values.country === country.name}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                        values.country === country.name
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {country.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Phone number" htmlFor="phone">
                  <Input
                    id="phone"
                    inputMode="tel"
                    value={values.phone}
                    onChange={(event) => setValues({ ...values, phone: event.target.value })}
                    placeholder={
                      countries.find((c) => c.name === values.country)?.dial + " 700 000000"
                    }
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field label="Currency" htmlFor="currency">
                  <Input
                    id="currency"
                    value={values.currency}
                    onChange={(event) =>
                      setValues({ ...values, currency: event.target.value.toUpperCase() })
                    }
                    className="h-11 rounded-xl"
                  />
                </Field>
              </div>

              <Field label="Business address (optional)" htmlFor="address">
                <Input
                  id="address"
                  value={values.address}
                  onChange={(event) => setValues({ ...values, address: event.target.value })}
                  placeholder="Shop 12, Kimathi Street, Nairobi"
                  className="h-11 rounded-xl"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Where do you sell?</Label>
                <p className="text-xs text-muted-foreground">
                  Pick every channel you use — orders can be tagged by channel.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {channels.map((channel) => {
                    const active = selected.includes(channel.key);
                    return (
                      <button
                        key={channel.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setSelected(
                            active
                              ? selected.filter((item) => item !== channel.key)
                              : [...selected, channel.key],
                          )
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium transition-colors",
                          active
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border text-muted-foreground hover:bg-accent",
                        )}
                      >
                        <channel.icon className="size-4 shrink-0" aria-hidden />
                        <span className="truncate">{channel.label}</span>
                        {active && <Check className="ml-auto size-4 shrink-0" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Short description (optional)" htmlFor="description">
                <Textarea
                  id="description"
                  value={values.description}
                  onChange={(event) => setValues({ ...values, description: event.target.value })}
                  placeholder="Handmade leather bags, delivered across Nairobi."
                  className="min-h-20 rounded-xl"
                />
              </Field>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="rounded-xl"
            disabled={step === 0 || finish.isPending}
            onClick={() => setStep(Math.max(0, step - 1))}
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
          <Button
            className="h-12 flex-1 rounded-xl text-base sm:flex-none sm:px-8"
            disabled={!canContinue || finish.isPending}
            onClick={next}
          >
            {finish.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {step === STEPS.length - 1 ? "Finish setup" : "Continue"}
            {step < STEPS.length - 1 && <ArrowRight className="size-4" aria-hidden />}
          </Button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
