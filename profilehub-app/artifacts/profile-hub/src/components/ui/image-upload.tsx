"use client";

import { useRef, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/modules/auth/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  /** Supabase Storage bucket name, e.g. "avatars" or "covers" */
  bucket: "avatars" | "covers";
  /** Current URL value */
  value?: string;
  /** Called with the new public URL after a successful upload, or "" on removal */
  onChange: (url: string) => void;
  /** Label shown above the upload area */
  label?: string;
  /** CSS class for the container */
  className?: string;
  /** Whether this is a circular avatar or a wide cover */
  variant?: "avatar" | "cover";
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImageUpload({
  bucket,
  value,
  onChange,
  label,
  className = "",
  variant = "avatar",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only JPG, PNG, WebP, and GIF images are allowed.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("Image must be under 5 MB.");
        return;
      }

      setError(null);
      setUploading(true);

      // Show local preview immediately
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("You must be logged in to upload images.");
          setUploading(false);
          return;
        }

        // Generate a unique filename under the user's folder
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${user.id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          setError(uploadError.message);
          setUploading(false);
          return;
        }

        // Get the public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(fileName);

        onChange(publicUrl);
        setPreview(null);
      } catch (err: any) {
        setError(err?.message || "Upload failed.");
      } finally {
        setUploading(false);
        // Reset input so re-selecting the same file triggers onChange
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [bucket, onChange]
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setPreview(null);
    setError(null);
  }, [onChange]);

  const displayUrl = preview || value;
  const isAvatar = variant === "avatar";

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        onChange={handleFileChange}
        data-testid={`upload-${bucket}`}
      />

      {displayUrl ? (
        <div className="relative group">
          <div
            className={`overflow-hidden border bg-muted ${
              isAvatar
                ? "w-28 h-28 rounded-full"
                : "w-full h-40 rounded-xl"
            }`}
          >
            <Image
              src={displayUrl}
              alt={label || bucket}
              fill
              className="object-cover"
              sizes={isAvatar ? "112px" : "100vw"}
              unoptimized
            />
          </div>

          {/* Overlay buttons */}
          <div
            className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity ${
              isAvatar ? "rounded-full" : "rounded-xl"
            }`}
          >
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/25 bg-muted/50 hover:bg-muted transition-colors cursor-pointer ${
            isAvatar
              ? "w-28 h-28 rounded-full"
              : "w-full h-40 rounded-xl"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {isAvatar ? "Upload" : "Upload Cover"}
              </span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
