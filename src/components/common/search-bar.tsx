import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

export function SearchBar({
  value,
  onValueChange,
  placeholder = "Search…",
  className,
  ...rest
}: SearchBarProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label={rest["aria-label"] ?? placeholder}
        className="h-10 rounded-xl pl-9"
      />
    </div>
  );
}
