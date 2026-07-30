import { useEffect, useState } from "react";
import { usePwa } from "@/context/PwaContext";
import { Download, X, Sparkles } from "lucide-react";

const DISMISS_KEY = "pf_install_dismissed_at";
const VISITS_KEY = "pf_visits";

export default function InstallNudge() {
  const { canInstall, install, isStandalone } = usePwa();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Count this visit
    const count = Number(localStorage.getItem(VISITS_KEY) || "0") + 1;
    localStorage.setItem(VISITS_KEY, String(count));

    if (isStandalone) return;                    // already installed
    if (!canInstall) return;                     // browser can't install
    if (count < 2) return;                       // wait until 2nd visit
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
    // Re-show 7 days after dismissal
    if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;

    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [canInstall, isStandalone]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const doInstall = async () => {
    const ok = await install();
    setVisible(false);
    if (!ok) localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-50 card-forge p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500"
      data-testid="install-nudge"
      role="dialog"
      aria-label="Install PrintForge web app"
    >
      <button
        onClick={dismiss}
        data-testid="install-nudge-close"
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1.5 rounded-full text-forge-muted hover:text-forge-text hover:bg-forge-elevated"
      >
        <X className="w-3.5 h-3.5"/>
      </button>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-forge-primary/15 border border-forge-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-forge-primary"/>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-forge-text text-base leading-tight">Install PrintForge</div>
          <p className="text-xs text-forge-muted mt-1 leading-snug">
            Track live prints, get restock alerts, and check orders straight from your home screen. Free · offline-ready.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={doInstall} className="btn-forge rounded-full px-4 py-2 text-xs flex items-center gap-1.5" data-testid="install-nudge-install">
              <Download className="w-3.5 h-3.5"/> Install app
            </button>
            <button onClick={dismiss} className="text-xs font-mono uppercase tracking-widest text-forge-muted hover:text-forge-text px-2" data-testid="install-nudge-later">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
