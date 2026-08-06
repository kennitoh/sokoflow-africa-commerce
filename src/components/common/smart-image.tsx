import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { ImageOff } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { storageService, type ImageBucket } from "@/services/storage.service";

/** Resolves a stored image value (external URL or private storage path) to a usable src. */
export function useImageSrc(bucket: ImageBucket, value: string | null) {
  return useQuery({
    queryKey: ["image-src", bucket, value],
    queryFn: () => storageService.resolve(bucket, value),
    enabled: Boolean(value),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
  });
}

type SmartImageProps = {
  bucket: ImageBucket;
  value: string | null;
  alt: string;
  className?: string;
  fallbackIcon?: LucideIcon;
  /** Rendered inside the fallback area, e.g. an initials block. */
  fallback?: React.ReactNode;
};

export function SmartImage({
  bucket,
  value,
  alt,
  className,
  fallbackIcon: FallbackIcon = ImageOff,
  fallback,
}: SmartImageProps) {
  const { data: src, isLoading } = useImageSrc(bucket, value);

  if (value && isLoading) {
    return <Skeleton className={cn("size-full", className)} aria-hidden />;
  }

  if (!src) {
    return (
      <div
        className={cn(
          "grid size-full place-items-center bg-muted text-muted-foreground",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        {fallback ?? <FallbackIcon className="size-6" aria-hidden />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("size-full object-cover", className)}
    />
  );
}
