"use client";

import { useMemo, useState } from "react";
import { FileText, Sparkles, AlertTriangle, Check } from "lucide-react";

import { applyResumeFields } from "@/app/dashboard/actions";
import { ResumeDropZone } from "@/components/dashboard/ResumeDropZone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import type { Profile } from "@/modules/shared";
import {
  APPLICABLE_RESUME_FIELDS,
  PROFILE_FIELD_MAP,
  RESUME_FIELDS,
  RESUME_FIELD_LABEL_KEYS,
  isFieldEmpty,
  type ApplicableResumeField,
  type ResumeAnalysis,
  type ResumeFieldKey,
} from "@/lib/resume/analysis";

const SECTION_LABELS: Record<string, string> = {
  contact: "resume.field.email",
  summary: "resume.field.summary",
  experience: "resume.field.experience",
  education: "resume.field.education",
  skills: "resume.field.skills",
};

const IMPACT_KEYS = {
  high: "resume.impactHigh",
  medium: "resume.impactMedium",
  low: "resume.impactLow",
} as const satisfies Record<string, MessageKey>;

const ERROR_KEYS: Record<string, MessageKey> = {
  file_too_large: "resume.fileTooLarge",
  unsupported_type: "resume.unsupportedType",
  extract_failed: "resume.extractFailed",
  too_short: "resume.tooShort",
  analysis_failed: "resume.analysisFailed",
  no_input: "resume.noFile",
};

function scoreColor(score: number): string {
  if (score >= 71) return "bg-emerald-500";
  if (score >= 41) return "bg-amber-500";
  return "bg-rose-500";
}

/** Which profile field a resume field maps onto, and what is currently there. */
type FieldPlan = {
  key: ApplicableResumeField;
  suggested: string;
  current: string;
  isEmpty: boolean;
};

export default function ResumeAnalyzer({ profile }: { profile: Profile }) {
  const { t, locale } = useLocale();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [meta, setMeta] = useState<{ fallback: boolean; model: string | null } | null>(null);
  const [applying, setApplying] = useState(false);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [appliedFields, setAppliedFields] = useState<string[]>([]);

  const currentValues = useMemo<Record<ApplicableResumeField, string>>(
    () => ({
      fullName: profile.displayName ?? "",
      headline: profile.title ?? profile.profession ?? "",
      summary: profile.bio ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
    }),
    [profile]
  );

  /**
   * The core rule the user asked for: an empty profile field is filled
   * automatically, a populated one is only ever a suggestion they opt into.
   */
  const plans = useMemo<FieldPlan[]>(() => {
    if (!analysis) return [];

    return APPLICABLE_RESUME_FIELDS.flatMap((key) => {
      const suggested = String(analysis.fields[key] ?? "").trim();
      if (!suggested) return [];

      const current = currentValues[key].trim();
      return [{ key, suggested, current, isEmpty: !current }];
    });
  }, [analysis, currentValues]);

  const autoFillCount = plans.filter((plan) => plan.isEmpty).length;
  const reviewCount = plans.filter((plan) => !plan.isEmpty).length;

  const isAccepted = (plan: FieldPlan) =>
    plan.isEmpty ? accepted[plan.key] !== false : accepted[plan.key] === true;

  const selectedCount = plans.filter(isAccepted).length;

  const handleAnalyze = async () => {
    if (!file && pastedText.trim().length === 0) {
      toast({ title: t("resume.noFile"), variant: "destructive" });
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setMeta(null);
    setAppliedFields([]);
    setAccepted({});

    try {
      const formData = new FormData();
      formData.append("locale", locale);
      if (file) formData.append("file", file);
      else formData.append("text", pastedText);

      const response = await fetch("/api/resume/analyze", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const key = ERROR_KEYS[payload?.error] ?? "resume.analysisFailed";
        toast({ title: t(key), variant: "destructive" });
        return;
      }

      setAnalysis(payload.analysis);
      setMeta({ fallback: Boolean(payload.meta?.fallback), model: payload.meta?.model ?? null });
    } catch {
      toast({ title: t("resume.analysisFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const chosen = plans.filter(isAccepted);
    if (!chosen.length) return;

    setApplying(true);
    try {
      const payload: Partial<Record<string, string>> = {};
      for (const plan of chosen) {
        payload[PROFILE_FIELD_MAP[plan.key]] = plan.suggested;
      }

      const result = await applyResumeFields(payload);

      if (result.ok) {
        setAppliedFields(chosen.map((plan) => plan.key));
        toast({ title: t("resume.applied") });
      } else {
        toast({ title: t("status.error"), description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: t("status.error"), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-serif">{t("resume.title")}</h1>
        <p className="text-muted-foreground">{t("resume.subtitle")}</p>
      </header>

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border bg-card p-6">
        <Tabs defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload">{t("resume.uploadTab")}</TabsTrigger>
            <TabsTrigger value="paste">{t("resume.pasteTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="pt-4">
            <ResumeDropZone
              file={file}
              disabled={loading}
              onFile={(next) => {
                setFile(next);
                if (next) setPastedText("");
              }}
              onError={(key) => toast({ title: t(key), variant: "destructive" })}
            />
          </TabsContent>

          <TabsContent value="paste" className="pt-4">
            <Textarea
              value={pastedText}
              onChange={(event) => {
                setPastedText(event.target.value);
                setFile(null);
              }}
              placeholder={t("resume.pastePlaceholder")}
              rows={10}
              data-testid="resume-text-input"
            />
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleAnalyze} disabled={loading} data-testid="btn-analyze-resume">
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            {loading ? t("resume.analyzing") : analysis ? t("resume.reanalyze") : t("resume.analyze")}
          </Button>

          {meta?.fallback && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {t("resume.usingFallback")}
            </span>
          )}
          {meta && !meta.fallback && meta.model && (
            <span className="text-xs text-muted-foreground">
              {t("resume.usingModel")} {meta.model}
            </span>
          )}
        </div>
      </section>

      {analysis && (
        <>
          {/* ── Scores ────────────────────────────────────────────────────── */}
          <section className="rounded-xl border bg-card p-6 space-y-6">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <p className="text-sm text-muted-foreground">{t("resume.overallScore")}</p>
                <p className="text-4xl font-semibold tabular-nums" data-testid="resume-overall-score">
                  {analysis.overallScore}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("resume.averageStrength")}</p>
                <p className="text-4xl font-semibold tabular-nums">
                  {analysis.averageStrength}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
              </div>
            </div>

            {analysis.sectionScores.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t("resume.sectionScores")}
                </h2>
                {analysis.sectionScores.map((section) => {
                  const labelKey = SECTION_LABELS[section.key];
                  const label = labelKey ? t(labelKey as MessageKey) : section.key;

                  return (
                    <div key={section.key} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <span className="font-medium capitalize">{label}</span>
                        <span className="tabular-nums text-muted-foreground">{section.score}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${scoreColor(section.score)}`}
                          style={{ width: `${section.score}%` }}
                        />
                      </div>
                      {section.comment && (
                        <p className="text-xs text-muted-foreground">{section.comment}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Extracted fields ──────────────────────────────────────────── */}
          <section className="rounded-xl border bg-card p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{t("resume.extractedFields")}</h2>
              <p className="text-sm text-muted-foreground">{t("resume.extractedHint")}</p>
            </div>

            <dl className="divide-y">
              {RESUME_FIELDS.map((key) => {
                const value = analysis.fields[key as ResumeFieldKey];
                const empty = isFieldEmpty(value);

                return (
                  <div key={key} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {t(RESUME_FIELD_LABEL_KEYS[key])}
                    </dt>
                    <dd className="sm:col-span-2 text-sm">
                      {empty ? (
                        <span className="text-muted-foreground italic">{t("resume.notFound")}</span>
                      ) : Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {value.map((item, index) => (
                            <Badge key={`${key}-${index}`} variant="secondary" className="font-normal">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{value}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          {/* ── Apply to profile ──────────────────────────────────────────── */}
          {plans.length > 0 && (
            <section className="rounded-xl border bg-card p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{t("resume.applyToProfile")}</h2>
                <p className="text-sm text-muted-foreground">
                  {autoFillCount > 0 && `${autoFillCount} ${t("resume.emptyFilled")}`}
                  {autoFillCount > 0 && reviewCount > 0 && " · "}
                  {reviewCount > 0 && `${reviewCount} ${t("resume.needsReview")}`}
                </p>
              </div>

              <div className="space-y-3">
                {plans.map((plan) => {
                  const applied = appliedFields.includes(plan.key);
                  const checked = isAccepted(plan);

                  return (
                    <div
                      key={plan.key}
                      className="rounded-lg border p-4 space-y-3"
                      data-testid={`resume-plan-${plan.key}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {t(RESUME_FIELD_LABEL_KEYS[plan.key])}
                        </span>
                        {applied ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" aria-hidden />
                            {t("resume.applied")}
                          </Badge>
                        ) : plan.isEmpty ? (
                          <Badge variant="secondary">{t("resume.willAutofill")}</Badge>
                        ) : (
                          <Badge variant="outline">{t("resume.suggestedChange")}</Badge>
                        )}
                      </div>

                      {!plan.isEmpty && (
                        <div className="rounded-md bg-muted/50 p-3 text-sm">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t("resume.currentValue")}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words">{plan.current}</p>
                        </div>
                      )}

                      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                        <p className="whitespace-pre-wrap break-words">{plan.suggested}</p>
                      </div>

                      {!applied && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={checked ? "default" : "outline"}
                            onClick={() => setAccepted((prev) => ({ ...prev, [plan.key]: true }))}
                          >
                            {t("resume.useThis")}
                          </Button>
                          <Button
                            size="sm"
                            variant={checked ? "outline" : "default"}
                            onClick={() => setAccepted((prev) => ({ ...prev, [plan.key]: false }))}
                          >
                            {t("resume.keepCurrent")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={handleApply}
                disabled={applying || selectedCount === 0}
                data-testid="btn-apply-resume"
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden />
                {applying ? t("action.saving") : `${t("action.apply")} (${selectedCount})`}
              </Button>
            </section>
          )}

          {/* ── Advice ────────────────────────────────────────────────────── */}
          {analysis.advice.length > 0 && (
            <section className="rounded-xl border bg-card p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{t("resume.advice")}</h2>
                <p className="text-sm text-muted-foreground">{t("resume.adviceHint")}</p>
              </div>

              <ol className="space-y-3">
                {analysis.advice.map((item, index) => (
                  <li key={index} className="rounded-lg border p-4 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      <Badge
                        variant={item.impact === "high" ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {t(IMPACT_KEYS[item.impact])}
                      </Badge>
                    </div>
                    {item.detail && (
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
