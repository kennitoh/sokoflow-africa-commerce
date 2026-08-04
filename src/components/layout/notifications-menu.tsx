import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const notifications = [
  { id: "1", title: "3 products are low on stock", time: "12m ago" },
  { id: "2", title: "Order #1042 was paid", time: "1h ago" },
  { id: "3", title: "New customer joined from Nairobi", time: "3h ago" },
];

export function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.map((notification) => (
          <DropdownMenuItem key={notification.id} className="flex-col items-start gap-0.5">
            <span className="text-sm">{notification.title}</span>
            <span className="text-xs text-muted-foreground">{notification.time}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
