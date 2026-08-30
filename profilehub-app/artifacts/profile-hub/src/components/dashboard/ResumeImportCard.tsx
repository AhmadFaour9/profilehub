"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Sparkles, X, Check } from "lucide-react";

import { applyResumeFields } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import {
  APPLICABLE_RESUME_FIELDS,
  PROFILE_FIELD_MAP,
  RESUME_FIELD_LABEL_KEYS,
  type ResumeAnalysis,
} from "@/lib/resume/analysis";

const ERROR_KEYS: Record<string, MessageKey> = {
  file_too_large: "resume.fileTooLarge",
  unsupported_type: "resume.unsupportedType",
  extract_failed: "resume.extractFailed",
  too_short: "resume.tooShort",
  analysis_failed: "resume.analysisFailed",
  no_input: "resume.noFile",
};

/**
 * Compact CV import for onboarding.
 *
 * The full report lives at /dashboard/resume. Here the goal is only to get a
 * new, empty profile populated in one step, so it applies every readable field
 * at once and refreshes the form underneath rather than showing scores.
 */
export function ResumeImportCard({ onDismiss }: { onDismiss?: () => void }) {
  const { t, locale } = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dismissed, setDismissed] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [filled, setFilled] = useState<string[]>([]);

  if (dismissed) return null;

  const runImport = async (payload: FormData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/resume/analyze", { method: "POST", body: payload });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast({ title: t(ERROR_KEYS[body?.error] ?? "resume.analysisFailed"), variant: "destructive" });
        return;
      }

      const analysis = body.analysis as ResumeAnalysis;
      const updates: Record<string, string> = {};
      const applied: string[] = [];

      for (const key of APPLICABLE_RESUME_FIELDS) {
        const value = String(analysis.fields[key] ?? "").trim();
        if (!value) continue;
        updates[PROFILE_FIELD_MAP[key]] = value;
        applied.push(key);
      }

      if (!applied.length) {
        toast({ title: t("onboarding.resumeNothing"), variant: "destructive" });
        return;
      }

      const result = await applyResumeFields(updates);

      if (!result.ok) {
        toast({ title: t("status.error"), description: result.message, variant: "destructive" });
        return;
      }

      setFilled(applied);
      toast({ title: t("onboarding.resumeFilled") });

      // The profile form below is server-rendered, so it needs a refresh to
      // pick up the values that were just written.
      router.refresh();
    } catch {
      toast({ title: t("resume.analysisFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file: File) => {
    const data = new FormData();
    data.append("locale", locale);
    data.append("file", file);
    void runImport(data);
  };

  const handlePaste = () => {
    if (!pastedText.trim()) {
      toast({ title: t("resume.noFile"), variant: "destructive" });
      return;
    }
    const data = new FormData();
    data.append("locale", locale);
    data.append("text", pastedText);
    void runImport(data);
  };

  const dismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <section className="relative rounded-xl border border-primary/30 bg-primary/5 p-6">
      <button
        type="button"
        onClick={dismiss}
        className="absolute end-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t("action.dismiss")}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="space-y-1 pe-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          {t("onboarding.resumeTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("onboarding.resumeHint")}</p>
      </div>

      {filled.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Check className="h-4 w-4 text-emerald-600" aria-hidden />
            {t("onboarding.resumeFilled")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {filled.map((key) => (
              <Badge key={key} variant="secondary" className="font-normal">
                {t(RESUME_FIELD_LABEL_KEYS[key as keyof typeof RESUME_FIELD_LABEL_KEYS])}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{t("onboarding.manualStep")}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              data-testid="btn-onboarding-resume-upload"
            >
              <FileUp className="me-2 h-4 w-4" aria-hidden />
              {loading ? t("resume.analyzing") : t("resume.upload")}
            </Button>

            <Button variant="ghost" onClick={() => setShowPaste((prev) => !prev)} disabled={loading}>
              {t("resume.pasteTab")}
            </Button>

            <Button variant="ghost" onClick={dismiss} disabled={loading}>
              {t("onboarding.resumeSkip")}
            </Button>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">{t("resume.uploadHint")}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) handleFile(selected);
              event.target.value = "";
            }}
          />

          {showPaste && (
            <div className="mt-4 space-y-2">
              <Textarea
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                placeholder={t("resume.pastePlaceholder")}
                rows={7}
              />
              <Button onClick={handlePaste} disabled={loading} size="sm">
                {loading ? t("resume.analyzing") : t("onboarding.resumeFill")}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
