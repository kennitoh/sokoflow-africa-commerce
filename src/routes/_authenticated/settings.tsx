import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/hooks/use-auth";
import { profileService } from "@/services/profile.service";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SokoFlow" },
      { name: "description", content: "Manage your business profile, appearance and workspace preferences." },
      { property: "og:title", content: "Settings — SokoFlow" },
      { property: "og:description", content: "Manage your SokoFlow workspace preferences." },
    ],
  }),
  component: SettingsPage,
});

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

  const saveProfile = useMutation({
    mutationFn: (values: { full_name: string; business_name: string; phone: string }) =>
      profileService.upsert({ id: userId!, ...values }),
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save your profile"),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveProfile.mutate({
      full_name: String(form.get("full_name") ?? ""),
      business_name: String(form.get("business_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
    });
  }

  const profile = profileQuery.data;
  const metadata = user?.user_metadata ?? {};

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your business profile, appearance and workspace preferences."
        breadcrumbs={[{ label: "SokoFlow", to: "/dashboard" }, { label: "Settings" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-5 p-5">
            <SectionHeader title="Business profile" description="Shown on receipts and invoices." />
            {profileQuery.isLoading ? (
              <LoadingState label="Loading your profile" />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      defaultValue={profile?.full_name ?? (metadata["full_name"] as string) ?? ""}
                      placeholder="Amina Otieno"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business name</Label>
                    <Input
                      id="business_name"
                      name="business_name"
                      defaultValue={profile?.business_name ?? (metadata["business_name"] as string) ?? ""}
                      placeholder="Soko Fresh Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="+254 700 000000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email ?? ""} readOnly disabled />
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button type="submit" disabled={saveProfile.isPending}>
                    {saveProfile.isPending && <Loader2 className="size-4 animate-spin" />} Save changes
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

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
                Low-stock and order alerts arrive with the next release.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
