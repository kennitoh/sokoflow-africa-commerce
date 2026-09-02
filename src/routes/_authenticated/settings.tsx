import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Facebook, Instagram, Loader2, MessageCircle, Music2, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { ImageUpload } from "@/components/common/image-upload";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { profileService } from "@/services/profile.service";
import type { Profile, SalesChannelKey } from "@/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Business profile & settings — SokoFlow" },
      {
        name: "description",
        content:
          "Update your business name, logo, contacts, selling channels, currency and appearance — the details that show on receipts and invoices.",
      },
      { property: "og:title", content: "Business profile & settings — SokoFlow" },
      {
        property: "og:description",
        content: "Manage your SokoFlow business profile, contacts and workspace preferences.",
      },
    ],
  }),
  component: SettingsPage,
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
  { name: "Kenya", currency: "KES" },
  { name: "Uganda", currency: "UGX" },
  { name: "Tanzania", currency: "TZS" },
  { name: "Nigeria", currency: "NGN" },
  { name: "Ghana", currency: "GHS" },
  { name: "Rwanda", currency: "RWF" },
  { name: "South Africa", currency: "ZAR" },
];

const channelOptions: { key: SalesChannelKey; label: string; icon: typeof Instagram }[] = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "tiktok", label: "TikTok", icon: Music2 },
  { key: "physical_store", label: "Physical store", icon: Store },
];

type FormValues = {
  full_name: string;
  business_name: string;
  business_type: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  country: string;
  city: string;
  address: string;
  currency: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
};

const EMPTY: FormValues = {
  full_name: "",
  business_name: "",
  business_type: "",
  description: "",
  phone: "",
  whatsapp: "",
  email: "",
  country: "",
  city: "",
  address: "",
  currency: "KES",
  instagram_url: "",
  facebook_url: "",
  tiktok_url: "",
};

function toForm(profile: Profile | null, fallbackEmail: string): FormValues {
  return {
    full_name: profile?.full_name ?? "",
    business_name: profile?.business_name ?? "",
    business_type: profile?.business_type ?? "",
    description: profile?.description ?? "",
    phone: profile?.phone ?? "",
    whatsapp: profile?.whatsapp ?? "",
    email: profile?.email ?? fallbackEmail,
    country: profile?.country ?? "",
    city: profile?.city ?? "",
    address: profile?.address ?? "",
    currency: profile?.currency ?? "KES",
    instagram_url: profile?.instagram_url ?? "",
    facebook_url: profile?.facebook_url ?? "",
    tiktok_url: profile?.tiktok_url ?? "",
  };
}

function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileService.get(userId!),
    enabled: Boolean(userId),
  });

  const profile = profileQuery.data ?? null;
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [channels, setChannels] = useState<SalesChannelKey[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profileQuery.isSuccess) return;
    setValues(toForm(profile, user?.email ?? ""));
    setChannels((profile?.sales_channels ?? []) as SalesChannelKey[]);
    setLogoUrl(profile?.logo_url ?? null);
  }, [profileQuery.isSuccess, profile, user?.email]);

  const saved = toForm(profile, user?.email ?? "");
  const dirty =
    JSON.stringify(values) !== JSON.stringify(saved) ||
    JSON.stringify(channels) !== JSON.stringify((profile?.sales_channels ?? []) as string[]) ||
    logoUrl !== (profile?.logo_url ?? null);

  const filled = [
    values.business_name,
    values.business_type,
    values.phone || values.whatsapp,
    values.country,
    values.city,
    logoUrl,
    channels.length > 0 ? "yes" : "",
  ].filter(Boolean).length;
  const completeness = Math.round((filled / 7) * 100);

  const saveProfile = useMutation({
    mutationFn: () =>
      profileService.upsert({
        id: userId!,
        full_name: values.full_name.trim() || null,
        business_name: values.business_name.trim() || null,
        business_type: values.business_type || null,
        description: values.description.trim() || null,
        phone: values.phone.trim() || null,
        whatsapp: values.whatsapp.trim() || null,
        email: values.email.trim() || null,
        country: values.country || null,
        city: values.city.trim() || null,
        address: values.address.trim() || null,
        currency: values.currency.trim().toUpperCase() || "KES",
        instagram_url: values.instagram_url.trim() || null,
        facebook_url: values.facebook_url.trim() || null,
        tiktok_url: values.tiktok_url.trim() || null,
        sales_channels: channels,
        logo_url: logoUrl,
      }),
    onSuccess: () => {
      toast.success("Business profile saved");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save your profile"),
  });

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your business profile, appearance and workspace preferences."
        breadcrumbs={[{ label: "SokoFlow", to: "/home" }, { label: "Settings" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="space-y-5 p-5">
              <SectionHeader
                title="Business profile"
                description="Shown on receipts, invoices and anything you share with customers."
              />

              {profileQuery.isError ? (
                <ErrorState error={profileQuery.error} onRetry={() => profileQuery.refetch()} />
              ) : profileQuery.isLoading ? (
                <LoadingState label="Loading your profile" />
              ) : (
                <form
                  className="space-y-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveProfile.mutate();
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Profile strength
                      </p>
                      <span className="text-xs font-semibold">{completeness}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${completeness}%` }}
                      />
                    </div>
                    {completeness < 100 && (
                      <p className="text-xs text-muted-foreground">
                        Add your logo, location and selling channels so invoices look complete.
                      </p>
                    )}
                  </div>

                  <ImageUpload
                    bucket="business-logos"
                    value={logoUrl}
                    onChange={setLogoUrl}
                    label="Business logo"
                    shape="square"
                    alt={values.business_name || "Business logo"}
                    hint="Square works best. JPG, PNG or WEBP up to 5MB. Only you can see the file."
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Your name" htmlFor="full_name">
                      <Input
                        id="full_name"
                        value={values.full_name}
                        onChange={(event) => set("full_name", event.target.value)}
                        placeholder="Amina Otieno"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="Business name" htmlFor="business_name">
                      <Input
                        id="business_name"
                        value={values.business_name}
                        onChange={(event) => set("business_name", event.target.value)}
                        placeholder="Soko Fresh Ltd"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="What you sell" htmlFor="business_type">
                      <select
                        id="business_type"
                        value={values.business_type}
                        onChange={(event) => set("business_type", event.target.value)}
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Choose a category</option>
                        {businessTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Currency" htmlFor="currency">
                      <Input
                        id="currency"
                        value={values.currency}
                        onChange={(event) => set("currency", event.target.value.toUpperCase())}
                        maxLength={5}
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="Phone" htmlFor="phone">
                      <Input
                        id="phone"
                        value={values.phone}
                        onChange={(event) => set("phone", event.target.value)}
                        placeholder="+254 700 000000"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="WhatsApp" htmlFor="whatsapp">
                      <Input
                        id="whatsapp"
                        value={values.whatsapp}
                        onChange={(event) => set("whatsapp", event.target.value)}
                        placeholder="+254 700 000000"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="Business email" htmlFor="email">
                      <Input
                        id="email"
                        type="email"
                        value={values.email}
                        onChange={(event) => set("email", event.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="Sign-in email" htmlFor="account_email">
                      <Input
                        id="account_email"
                        value={user?.email ?? ""}
                        readOnly
                        disabled
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="Country" htmlFor="country">
                      <select
                        id="country"
                        value={values.country}
                        onChange={(event) => {
                          const next = event.target.value;
                          const match = countries.find((item) => item.name === next);
                          setValues((previous) => ({
                            ...previous,
                            country: next,
                            currency: match?.currency ?? previous.currency,
                          }));
                        }}
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Choose a country</option>
                        {countries.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="City / town" htmlFor="city">
                      <Input
                        id="city"
                        value={values.city}
                        onChange={(event) => set("city", event.target.value)}
                        placeholder="Nairobi"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                  </div>

                  <Field label="Address" htmlFor="address">
                    <Input
                      id="address"
                      value={values.address}
                      onChange={(event) => set("address", event.target.value)}
                      placeholder="Shop 12, Kimathi Street"
                      className="h-11 rounded-xl"
                    />
                  </Field>

                  <Field label="About your business" htmlFor="description">
                    <Textarea
                      id="description"
                      value={values.description}
                      onChange={(event) => set("description", event.target.value)}
                      placeholder="Fresh groceries delivered around Nairobi within 24 hours."
                      className="min-h-20 rounded-xl"
                    />
                  </Field>

                  <div className="space-y-2">
                    <Label className="text-xs">Where you sell</Label>
                    <div className="flex flex-wrap gap-2">
                      {channelOptions.map((option) => {
                        const active = channels.includes(option.key);
                        return (
                          <button
                            key={option.key}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setChannels((previous) =>
                                active
                                  ? previous.filter((item) => item !== option.key)
                                  : [...previous, option.key],
                              )
                            }
                            className={cn(
                              "flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                              active
                                ? "border-primary bg-primary-soft text-primary"
                                : "border-border text-muted-foreground hover:bg-accent",
                            )}
                          >
                            <option.icon className="size-3.5" aria-hidden />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Instagram link" htmlFor="instagram_url">
                      <Input
                        id="instagram_url"
                        value={values.instagram_url}
                        onChange={(event) => set("instagram_url", event.target.value)}
                        placeholder="instagram.com/…"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="Facebook link" htmlFor="facebook_url">
                      <Input
                        id="facebook_url"
                        value={values.facebook_url}
                        onChange={(event) => set("facebook_url", event.target.value)}
                        placeholder="facebook.com/…"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field label="TikTok link" htmlFor="tiktok_url">
                      <Input
                        id="tiktok_url"
                        value={values.tiktok_url}
                        onChange={(event) => set("tiktok_url", event.target.value)}
                        placeholder="tiktok.com/@…"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {dirty && (
                      <span className="mr-auto text-xs font-medium text-muted-foreground">
                        You have unsaved changes
                      </span>
                    )}
                    {dirty && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setValues(saved);
                          setChannels((profile?.sales_channels ?? []) as SalesChannelKey[]);
                          setLogoUrl(profile?.logo_url ?? null);
                        }}
                      >
                        Discard
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className="h-11 rounded-xl"
                      disabled={saveProfile.isPending || !dirty}
                    >
                      {saveProfile.isPending && <Loader2 className="size-4 animate-spin" />}
                      Save changes
                    </Button>
                  </div>

                  {saveProfile.isError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                    >
                      {saveProfile.error instanceof Error
                        ? saveProfile.error.message
                        : "Could not save your profile"}
                    </p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-5 p-5">
            <SectionHeader title="Appearance" description="Your theme is remembered on this device." />
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Dark mode</p>
                <p className="text-xs text-muted-foreground">Easier on the eyes at night.</p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                aria-label="Toggle dark mode"
              />
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">
                Low-stock and delivery alerts appear in the bell menu at the top of your workspace.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
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
