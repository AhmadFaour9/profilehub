export type StorageBucket = "avatars" | "covers" | "project-media" | "gallery-media";

const STORAGE_RULES: Record<StorageBucket, { maxBytes: number; mimeTypes: string[] }> = {
  avatars: {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  covers: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  "project-media": {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  "gallery-media": {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"],
  },
};

export function validateStorageFile(bucket: StorageBucket, file: File): string | null {
  const rule = STORAGE_RULES[bucket];
  if (!rule) return "Unknown storage bucket.";

  if (!rule.mimeTypes.includes(file.type)) {
    return `Unsupported file type. Allowed: ${rule.mimeTypes.join(", ")}`;
  }

  if (file.size > rule.maxBytes) {
    const maxMB = Math.round(rule.maxBytes / 1024 / 1024);
    return `File is too large. Maximum size: ${maxMB} MB.`;
  }

  return null;
}

export function createStoragePath(userId: string, file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}
