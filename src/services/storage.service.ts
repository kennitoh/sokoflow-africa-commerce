import { supabase } from "@/integrations/supabase/client";

export type ImageBucket = "product-images" | "business-logos";

/** Signed URLs are cached for a week; long enough for a browsing session. */
const SIGNED_TTL_SECONDS = 60 * 60 * 24 * 7;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split("/")[1] ?? "jpg";
}

export const storageService = {
  validate(file: File) {
    if (!ALLOWED.includes(file.type)) {
      return "Please choose a JPG, PNG, WEBP or GIF image.";
    }
    if (file.size > MAX_BYTES) {
      return "That image is larger than 5MB. Try a smaller one.";
    }
    return null;
  },

  /** Uploads into the signed-in owner's folder and returns the storage path. */
  async upload(bucket: ImageBucket, file: File): Promise<string> {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("Please sign in again to upload images.");

    const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  },

  async remove(bucket: ImageBucket, path: string) {
    if (!path || /^https?:\/\//.test(path)) return;
    await supabase.storage.from(bucket).remove([path]);
  },

  /** Resolves a stored value (external URL or storage path) into a displayable src. */
  async resolve(bucket: ImageBucket, value: string | null): Promise<string | null> {
    if (!value) return null;
    if (/^(https?:|data:|blob:)/.test(value)) return value;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(value, SIGNED_TTL_SECONDS);
    if (error) return null;
    return data?.signedUrl ?? null;
  },
};
