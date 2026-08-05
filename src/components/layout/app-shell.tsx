import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NewOrderProvider, useNewOrder } from "@/features/orders/new-order-context";
import { Plus } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <NewOrderProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
              <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
                <SidebarTrigger className="hidden shrink-0 rounded-xl md:flex" />
                <div className="min-w-0 flex-1">
                  <CommandPalette />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <NewOrderButton />
                  <ThemeToggle />
                  <NotificationsMenu />
                  <UserMenu />
                </div>
              </div>
            </header>
            <main className="flex-1 px-4 pt-6 pb-28 sm:px-6 sm:py-8 md:pb-8">
              <div className="mx-auto w-full max-w-7xl space-y-8">{children}</div>
            </main>
          </div>
          <MobileNav />
        </div>
      </SidebarProvider>
    </NewOrderProvider>
  );
}

function NewOrderButton() {
  const { openNewOrder } = useNewOrder();
  return (
    <Button onClick={openNewOrder} className="hidden rounded-xl md:inline-flex">
      <Plus className="size-4" /> New order
    </Button>
  );
}
