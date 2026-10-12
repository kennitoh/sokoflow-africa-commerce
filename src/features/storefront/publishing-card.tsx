import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Globe, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { storeService, type PublicContact } from "@/services/store.service";

const contactOptions: { key: keyof PublicContact; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp number" },
  { key: "phone", label: "Phone number" },
  { key: "email", label: "Business email" },
  { key: "location", label: "City & country" },
  { key: "social", label: "Social media links" },
];

export function PublishingCard({ businessName }: { businessName: string }) {
  const queryClient = useQueryClient();
  const storeQuery = useQuery({ queryKey: ["store"], queryFn: () => storeService.current() });
  const store = storeQuery.data ?? null;

  const [slug, setSlug] = useState("");
  const [contact, setContact] = useState<PublicContact>({});
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!store) return;
    setSlug(store.slug ?? "");
    setContact(((store.settings ?? {}) as { public_contact?: PublicContact }).public_contact ?? {});
  }, [store]);

  const save = useMutation({
    mutationFn: async (isPublished: boolean) => {
      const current =
        store ?? (await storeService.ensure({ name: businessName || "My store", channels: [] }));
      return storeService.updatePublishing(current, {
        is_published: isPublished,
        slug,
        public_contact: contact,
      });
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["store"], next);
      toast.success(next.is_published ? "Your business page is live" : "Publishing settings saved");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update publishing"),
  });

  const publicUrl = store?.slug ? `${origin}/s/${store.slug}` : "";
  const published = Boolean(store?.is_published);

  async function copy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <SectionHeader
          title="Public business page"
          description="Anyone with the link can see your business details and the products you choose to show. Nothing else is shared."
        />
        {storeQuery.isError ? (
          <ErrorState error={storeQuery.error} onRetry={() => storeQuery.refetch()} />
        ) : storeQuery.isLoading ? (
          <LoadingState label="Loading publishing settings" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{published ? "Published" : "Not published"}</p>
                <p className="text-xs text-muted-foreground">
                  {published
                    ? "Your page is visible to anyone with the link."
                    : "Your page is hidden. Visitors see “not found”."}
                </p>
              </div>
              <Switch
                checked={published}
                disabled={save.isPending}
                onCheckedChange={(checked) => save.mutate(checked)}
                aria-label="Publish business page"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="store_slug" className="text-xs">
                Link name
              </Label>
              <div className="flex items-center rounded-xl border border-input bg-background pl-3 text-sm">
                <span className="shrink-0 text-muted-foreground">/s/</span>
                <Input
                  id="store_slug"
                  value={slug}
                  onChange={(event) =>
                    setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  maxLength={48}
                  className="h-11 border-0 pl-1 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            {published && publicUrl && (
              <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2">
                <Globe className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-primary">
                  {publicUrl}
                </span>
                <Button size="icon" variant="ghost" className="size-8" onClick={copy} aria-label="Copy link">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="size-8" asChild>
                  <a href={publicUrl} target="_blank" rel="noreferrer" aria-label="Open page">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            )}

            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium">Show on your page</p>
              {contactOptions.map((option) => (
                <label key={option.key} className="flex items-center justify-between gap-3 text-sm">
                  <span>{option.label}</span>
                  <Switch
                    checked={Boolean(contact[option.key])}
                    onCheckedChange={(checked) =>
                      setContact((previous) => ({ ...previous, [option.key]: checked }))
                    }
                  />
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                Your name and address are never shown. Only products you mark “Show on public page” appear.
                Publishing doesn’t guarantee your page appears in search engines.
              </p>
            </div>

            <Button
              className="h-11 w-full rounded-xl"
              variant="outline"
              disabled={save.isPending}
              onClick={() => save.mutate(published)}
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Save page settings
            </Button>
            {save.isError && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {save.error instanceof Error ? save.error.message : "Could not update publishing"}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
