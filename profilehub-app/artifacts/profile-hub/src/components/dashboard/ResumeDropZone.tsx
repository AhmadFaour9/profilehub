"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isSupported(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".pdf") ||
    name.endsWith(".docx")
  );
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drop target for a resume, with click-to-browse as the equal path.
 *
 * Type and size are checked here as well as on the server, so an obviously
 * wrong file is rejected before it is uploaded and parsed rather than after a
 * round trip.
 *
 * Drag events fire on children too, so a plain enter/leave pair flickers as the
 * pointer crosses the icon or the text. Depth counting keeps the highlight
 * steady until the pointer actually leaves the zone.
 */
export function ResumeDropZone({
  file,
  onFile,
  onError,
  disabled = false,
  compact = false,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  onError: (messageKey: "resume.unsupportedType" | "resume.fileTooLarge") => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    (candidate: File | undefined | null) => {
      if (!candidate) return;

      if (!isSupported(candidate)) {
        onError("resume.unsupportedType");
        return;
      }
      if (candidate.size > MAX_BYTES) {
        onError("resume.fileTooLarge");
        return;
      }

      onFile(candidate);
    },
    [onError, onFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      if (disabled) return;

      accept(event.dataTransfer.files?.[0]);
    },
    [accept, disabled]
  );

  return (
    <div
      // Without preventDefault on dragOver the browser navigates to the file
      // instead of firing drop.
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={(event) => {
        event.preventDefault();
        if (disabled) return;
        depth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
      data-testid="resume-dropzone"
      data-dragging={dragging ? "true" : "false"}
      className={`relative rounded-lg border border-dashed transition-colors ${
        dragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:bg-accent/40"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={`flex w-full flex-col items-center justify-center gap-2 text-center ${
          compact ? "px-4 py-6" : "px-6 py-12"
        }`}
      >
        {file ? (
          <FileText className="h-6 w-6 text-primary" aria-hidden />
        ) : (
          <Upload
            className={`h-6 w-6 transition-colors ${dragging ? "text-primary" : "text-muted-foreground"}`}
            aria-hidden
          />
        )}

        <span className="text-sm font-medium">
          {dragging ? t("resume.dropHere") : file ? file.name : t("resume.dropOrBrowse")}
        </span>

        <span className="text-xs text-muted-foreground">
          {file ? formatSize(file.size) : t("resume.uploadHint")}
        </span>
      </button>

      {file && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-2 top-2 h-7 w-7"
          onClick={() => {
            onFile(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          aria-label={t("action.remove")}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          accept(event.target.files?.[0]);
          // Reset so choosing the same file again still fires onChange.
          event.target.value = "";
        }}
        data-testid="resume-file-input"
      />
    </div>
  );
}
