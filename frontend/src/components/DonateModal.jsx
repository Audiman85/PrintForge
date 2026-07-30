import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HandHeart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const PRESETS = [
  { id: "tip_3",  amount: 3,  label: "$3",  hint: "Coffee" },
  { id: "tip_5",  amount: 5,  label: "$5",  hint: "Filament tip" },
  { id: "tip_10", amount: 10, label: "$10", hint: "Fuel a print" },
];

export default function DonateModal({ open, onOpenChange }) {
  const [pkg, setPkg] = useState("tip_5");
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);

  const isCustom = pkg === "custom";
  const parsedCustom = Math.round(parseFloat(custom || "0") * 100);
  const validAmount = isCustom ? (parsedCustom >= 100 && parsedCustom <= 50000) : true;

  const submit = async (e) => {
    e.preventDefault();
    if (!validAmount) {
      toast.error("Enter an amount between $1.00 and $500.00");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        package_id: pkg,
        origin_url: window.location.origin,
        supporter_name: anonymous ? "" : name.trim(),
        supporter_message: message.trim(),
        is_anonymous: anonymous || !name.trim(),
      };
      if (isCustom) payload.custom_amount_cents = parsedCustom;
      const { data } = await api.post("/donate/checkout", payload);
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error("Could not start checkout — try again in a moment.");
        setBusy(false);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || "Something went wrong";
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="donate-modal"
        className="bg-forge-surface border border-forge-border text-forge-text max-w-md sm:max-w-lg p-0 overflow-hidden"
      >
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-forge-primary/20 blur-3xl"/>
            <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-forge-tech/10 blur-3xl"/>
          </div>
          <DialogHeader className="relative px-6 pt-6 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 chip chip-tech text-[10px]">
                <HandHeart className="w-3 h-3"/> Support
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-forge-muted">Powered by Stripe</span>
            </div>
            <DialogTitle className="font-display text-2xl text-forge-text">
              Fuel the workshop.
            </DialogTitle>
            <DialogDescription className="text-forge-muted text-sm">
              Every tip keeps the printers humming, filament flowing, and new designs shipping.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="relative px-6 pb-6 space-y-5">
            <div className="grid grid-cols-4 gap-2" data-testid="donate-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPkg(p.id)}
                  data-testid={`donate-preset-${p.id}`}
                  className={`rounded-xl border px-2 py-3 text-center transition ${pkg === p.id
                    ? "bg-forge-primary text-forge-bg border-forge-primary shadow-forge"
                    : "bg-forge-elevated border-forge-border text-forge-text hover:border-forge-primary/60"}`}
                >
                  <div className="font-display text-lg leading-none">{p.label}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest mt-1 opacity-80">{p.hint}</div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPkg("custom")}
                data-testid="donate-preset-custom"
                className={`rounded-xl border px-2 py-3 text-center transition ${isCustom
                  ? "bg-forge-primary text-forge-bg border-forge-primary shadow-forge"
                  : "bg-forge-elevated border-forge-border text-forge-text hover:border-forge-primary/60"}`}
              >
                <div className="font-display text-lg leading-none">Custom</div>
                <div className="font-mono text-[9px] uppercase tracking-widest mt-1 opacity-80">Any $</div>
              </button>
            </div>

            {isCustom && (
              <div className="relative" data-testid="donate-custom-wrap">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted font-mono">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="1"
                  max="500"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Enter amount (1 – 500)"
                  className="w-full bg-forge-elevated border border-forge-border rounded-lg pl-7 pr-3 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
                  data-testid="donate-custom-input"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-forge-muted">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="w-4 h-4 accent-forge-primary"
                  data-testid="donate-anonymous"
                />
                Donate anonymously
              </label>
              {!anonymous && (
                <>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="Display name (optional)"
                    className="w-full bg-forge-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
                    data-testid="donate-name"
                  />
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={200}
                    placeholder="Leave a short message (optional)"
                    className="w-full bg-forge-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
                    data-testid="donate-message"
                  />
                </>
              )}
              <p className="text-[11px] text-forge-faint">
                Names appear on the Supporter Wall on the homepage. Amounts are never shown publicly.
              </p>
            </div>

            <Button
              type="submit"
              disabled={busy || !validAmount}
              data-testid="donate-submit"
              className="btn-forge w-full rounded-full py-5 text-sm"
            >
              {busy ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Redirecting…</>
              ) : (
                <><HandHeart className="w-4 h-4 mr-2"/> Continue to secure checkout</>
              )}
            </Button>
            <p className="text-center text-[10px] font-mono uppercase tracking-widest text-forge-faint">
              Test card 4242 4242 4242 4242 · any future date · any CVC
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
