import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { SmartImage } from "@/components/common/smart-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { storageService, type ImageBucket } from "@/services/storage.service";

type ImageUploadProps = {
  bucket: ImageBucket;
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  hint?: string;
  alt: string;
  /** "square" for logos/avatars, "wide" for product cards. */
  shape?: "square" | "wide";
  className?: string;
};

export function ImageUpload({
  bucket,
  value,
  onChange,
  label = "Image",
  hint = "JPG, PNG or WEBP up to 5MB.",
  alt,
  shape = "wide",
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = storageService.validate(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const previous = value;
      const path = await storageService.upload(bucket, file);
      onChange(path);
      if (previous) void storageService.remove(bucket, previous);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload that image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed p-3 transition-colors",
          dragging ? "border-primary bg-primary-soft/50" : "border-border",
        )}
      >
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-lg bg-muted",
            shape === "square" ? "size-16" : "h-16 w-24",
          )}
        >
          <SmartImage bucket={bucket} value={value} alt={alt} fallbackIcon={ImagePlus} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">{hint}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-3.5" aria-hidden />
              )}
              {value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-lg text-muted-foreground"
                disabled={busy}
                onClick={() => {
                  void storageService.remove(bucket, value);
                  onChange(null);
                }}
              >
                <Trash2 className="size-3.5" aria-hidden /> Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={`Upload ${alt}`}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
