import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { primaryNav } from "@/config/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/60 md:max-w-md"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search orders, products, customers…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to a module or run an action…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {primaryNav.map((item) => (
              <CommandItem
                key={item.url}
                value={item.title}
                onSelect={() => {
                  setOpen(false);
                  navigate({ to: item.url });
                }}
              >
                <item.icon className="size-4" />
                <span>{item.title}</span>
                {item.description && (
                  <span className="ml-auto text-xs text-muted-foreground">{item.description}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
