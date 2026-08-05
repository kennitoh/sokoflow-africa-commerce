import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { profileService } from "@/services/profile.service";

export function useWorkspace() {
  const { user } = useAuth();
  const userId = user?.id;

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileService.get(userId!),
    enabled: Boolean(userId),
  });

  const profile = profileQuery.data ?? null;
  const fallbackName =
    (user?.user_metadata?.["full_name"] as string | undefined) ||
    user?.email?.split("@")[0] ||
    "there";

  return {
    profile,
    isLoading: profileQuery.isLoading,
    currency: profile?.currency ?? "KES",
    ownerName: profile?.full_name || fallbackName,
    businessName: profile?.business_name || "Your business",
  };
}
