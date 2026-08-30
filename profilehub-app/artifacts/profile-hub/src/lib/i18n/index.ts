import { DEFAULT_LOCALE, type Locale } from "./config";
import { messages, type MessageKey } from "./messages";

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/**
 * Interpolates {name} placeholders. Falls back to English, then to the key
 * itself, so a missing translation degrades to readable text instead of blank UI.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  const table = messages[locale] ?? messages[DEFAULT_LOCALE];
  let value = table[key] ?? messages[DEFAULT_LOCALE][key] ?? key;

  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }

  return value;
}

export function createTranslator(locale: Locale): Translate {
  return (key, vars) => translate(locale, key, vars);
}

export * from "./config";
export { messages, type MessageKey };
