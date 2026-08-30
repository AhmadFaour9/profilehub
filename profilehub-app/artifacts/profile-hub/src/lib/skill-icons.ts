import type { IconType } from "react-icons";
import {
  SiAnthropic,
  SiApacheairflow,
  SiCplusplus,
  SiDocker,
  SiFastapi,
  SiFlask,
  SiGit,
  SiGithubactions,
  SiGooglecloud,
  SiGrafana,
  SiHuggingface,
  SiJavascript,
  SiKeras,
  SiLangchain,
  SiMlflow,
  SiMysql,
  SiN8N,
  SiNextdotjs,
  SiNodedotjs,
  SiNumpy,
  SiOllama,
  SiOpenai,
  SiOpentelemetry,
  SiPandas,
  SiPostgresql,
  SiPrometheus,
  SiPython,
  SiPytorch,
  SiReact,
  SiRedis,
  SiScikitlearn,
  SiStreamlit,
  SiSupabase,
  SiTensorflow,
  SiTypescript,
} from "react-icons/si";

/**
 * Brand icons for skills, drawn from react-icons/si (Simple Icons).
 *
 * Bundled rather than fetched: the icon set is already a dependency, so there
 * are no runtime requests, nothing to fail offline, and no third-party domain
 * to allow. Keys are matched case-insensitively against the skill name.
 *
 * Anything without a brand icon falls back to a category glyph, so a skill is
 * never rendered bare.
 */
const BY_NAME: Record<string, IconType> = {
  python: SiPython,
  "c#": SiCplusplus,
  javascript: SiJavascript,
  "javascript/typescript": SiTypescript,
  typescript: SiTypescript,
  sql: SiMysql,
  pytorch: SiPytorch,
  tensorflow: SiTensorflow,
  keras: SiKeras,
  "scikit-learn": SiScikitlearn,
  pandas: SiPandas,
  numpy: SiNumpy,
  "hugging face transformers": SiHuggingface,
  transformers: SiHuggingface,
  langchain: SiLangchain,
  n8n: SiN8N,
  openai: SiOpenai,
  anthropic: SiAnthropic,
  ollama: SiOllama,
  fastapi: SiFastapi,
  flask: SiFlask,
  "node.js": SiNodedotjs,
  "next.js": SiNextdotjs,
  react: SiReact,
  streamlit: SiStreamlit,
  docker: SiDocker,
  git: SiGit,
  "ci/cd": SiGithubactions,
  gcp: SiGooglecloud,
  "google cloud": SiGooglecloud,
  "google vertex ai": SiGooglecloud,
  "vertex ai": SiGooglecloud,
  mlflow: SiMlflow,
  airflow: SiApacheairflow,
  prometheus: SiPrometheus,
  grafana: SiGrafana,
  opentelemetry: SiOpentelemetry,
  postgresql: SiPostgresql,
  supabase: SiSupabase,
  redis: SiRedis,
};

export function getSkillIcon(name: string): IconType | null {
  const key = name.trim().toLowerCase();
  if (BY_NAME[key]) return BY_NAME[key];

  // "PyTorch (Lightning)" and similar should still resolve to the base brand.
  const base = key.split(/[(/,]/)[0].trim();
  return BY_NAME[base] ?? null;
}

/**
 * A stable colour per category so groups stay visually distinct without
 * anyone having to pick colours by hand. Hashing the name keeps a category's
 * colour the same across renders and across profiles.
 */
const CATEGORY_TONES = [
  "text-sky-600 dark:text-sky-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-violet-600 dark:text-violet-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-teal-600 dark:text-teal-400",
];

export function getCategoryTone(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_TONES[hash % CATEGORY_TONES.length];
}
