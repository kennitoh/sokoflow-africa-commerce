import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, LogOut, Settings, User } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth.service";

function initialsFrom(value: string) {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const email = user?.email ?? "";
  const displayName =
    (user?.user_metadata?.["full_name"] as string | undefined) || email.split("@")[0] || "Account";

  async function handleSignOut() {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await authService.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
              {initialsFrom(displayName || "SF")}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
          <User className="size-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
          <Settings className="size-4" /> Workspace settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Support chat is coming soon.")}>
          <LifeBuoy className="size-4" /> Get help
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-destructive">
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
