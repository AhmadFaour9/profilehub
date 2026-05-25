import { ProfileTheme } from "@/modules/shared";
import { Check } from "lucide-react";

const THEME_PRESETS = [
  { id: "thm_1", primaryColor: "#3A4F41", backgroundColor: "#FAF9F6", label: "Forest" },
  { id: "thm_2", primaryColor: "#171717", backgroundColor: "#FFFFFF", label: "Minimal" },
  { id: "thm_3", primaryColor: "#2563EB", backgroundColor: "#F8FAFC", label: "Ocean" },
  { id: "thm_4", primaryColor: "#9D4EDD", backgroundColor: "#FDF4FF", label: "Plum" },
  { id: "thm_5", primaryColor: "#E11D48", backgroundColor: "#FEF2F2", label: "Rose" },
  { id: "thm_6", primaryColor: "#D97706", backgroundColor: "#FFFBEB", label: "Amber" },
];

export function ThemePicker({ value, onChange }: { value?: ProfileTheme; onChange: (theme: ProfileTheme) => void }) {
  const handleColorSelect = (preset: typeof THEME_PRESETS[0]) => {
    onChange({
      ...value,
      id: value?.id || "custom",
      primaryColor: preset.primaryColor,
      backgroundColor: preset.backgroundColor,
    });
  };

  const handleStyleSelect = (style: "rounded" | "pill" | "sharp") => {
    onChange({
      ...value,
      id: value?.id || "custom",
      buttonStyle: style,
    });
  };

  return (
    <div className="space-y-8" data-testid="theme-picker">
      <div>
        <h3 className="text-sm font-medium mb-4">Color Palette</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleColorSelect(preset)}
              className="flex flex-col items-center gap-2 group"
              data-testid={`theme-color-${preset.label.toLowerCase()}`}
            >
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  value?.primaryColor === preset.primaryColor ? "border-primary scale-110" : "border-transparent group-hover:scale-105"
                }`}
                style={{ backgroundColor: preset.backgroundColor }}
              >
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: preset.primaryColor }}
                >
                  {value?.primaryColor === preset.primaryColor && (
                    <Check className="w-4 h-4 text-white mx-auto mt-1" />
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-4">Button Style</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: "rounded", label: "Rounded", class: "rounded-xl" },
            { id: "pill", label: "Pill", class: "rounded-full" },
            { id: "sharp", label: "Sharp", class: "rounded-none" },
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => handleStyleSelect(style.id as any)}
              className={`h-24 flex items-center justify-center border-2 bg-card transition-all ${
                value?.buttonStyle === style.id ? "border-primary" : "border-border hover:border-primary/50"
              } ${style.class}`}
              data-testid={`theme-style-${style.id}`}
            >
              <div className={`w-20 h-8 bg-primary/20 ${style.class}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
