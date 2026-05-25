import { create } from "zustand";
import { translations, Language } from "../lib/i18n";

type TranslationStore = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const useTranslationStore = create<TranslationStore>((set) => ({
  language: "en",
  setLanguage: (lang) => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    set({ language: lang });
  },
}));

export function useTranslation() {
  const { language, setLanguage } = useTranslationStore();

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || key;
  };

  return { t, language, setLanguage };
}
