import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Languages, Check } from "lucide-react";

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const change = (code) => {
    i18n.changeLanguage(code);
    try { localStorage.setItem("i18nextLng", code); } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-forge-border text-forge-muted hover:text-forge-text hover:border-forge-faint transition text-xs font-mono uppercase tracking-widest"
          data-testid="language-switcher"
        >
          <Languages className="w-3.5 h-3.5"/>
          {compact ? current.code.toUpperCase() : current.native}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-forge-surface border-forge-border text-forge-text max-h-[70vh] overflow-y-auto">
        {LANGUAGES.map(l => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => change(l.code)}
            data-testid={`lang-${l.code}`}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="text-forge-text">{l.native}</span>
              <span className="text-[10px] text-forge-muted font-mono uppercase">{l.name}</span>
            </div>
            {l.code === current.code && <Check className="w-4 h-4 text-forge-primary"/>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
