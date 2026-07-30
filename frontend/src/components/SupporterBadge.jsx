import { HandHeart } from "lucide-react";

/**
 * Small "Supporter" badge shown next to community design authors who have donated.
 * Usage: <SupporterBadge/> — controlled by parent conditional.
 */
export default function SupporterBadge({ label = "Supporter", compact = false, className = "" }) {
  return (
    <span
      title="Tipped PrintForge — thank you!"
      data-testid="supporter-badge"
      className={`inline-flex items-center gap-1 rounded-full border border-forge-primary/50 bg-forge-primary/15 text-forge-primary font-mono uppercase tracking-widest ${compact ? "px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]"} ${className}`}
    >
      <HandHeart className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"}`}/>
      {label}
    </span>
  );
}
