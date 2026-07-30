import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * Subscribe to restock alerts for a given material + specific colours.
 * Props: open, onOpenChange, material, colors (array of color names user wants).
 */
export default function RestockAlertModal({ open, onOpenChange, material, colors = [] }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      await api.post("/restock/subscribe", {
        email: trimmed,
        material,
        colors,
      });
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not subscribe");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(() => { setDone(false); setEmail(""); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(true); }}>
      <DialogContent
        data-testid="restock-modal"
        className="bg-forge-surface border border-forge-border text-forge-text max-w-md p-0 overflow-hidden"
      >
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-forge-primary/20 blur-3xl"/>
            <div className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-forge-tech/10 blur-3xl"/>
          </div>
          <DialogHeader className="relative px-6 pt-6 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 chip chip-tech text-[10px]">
                <Bell className="w-3 h-3"/> Alert
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-forge-muted">Email opt-in</span>
            </div>
            <DialogTitle className="font-display text-2xl text-forge-text">
              Get pinged the second it's back.
            </DialogTitle>
            <DialogDescription className="text-forge-muted text-sm">
              Subscribe for a one-off email when <span className="text-forge-primary">{material}</span>
              {colors.length ? <> ({colors.join(" / ")}) </> : " "}
              restocks. Unsubscribe any time.
            </DialogDescription>
          </DialogHeader>

          <div className="relative px-6 pb-6">
            {done ? (
              <div className="text-center py-6" data-testid="restock-success">
                <CheckCircle2 className="w-10 h-10 text-forge-primary mx-auto mb-3"/>
                <div className="font-display text-forge-text text-lg mb-1">You're on the list.</div>
                <p className="text-forge-muted text-sm mb-4">
                  We'll email <span className="text-forge-text">{email}</span> the moment {material} lands.
                </p>
                <Button onClick={close} className="btn-forge rounded-full px-6" data-testid="restock-close">
                  Nice — close
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest text-forge-muted mb-1.5 block">Your email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    data-testid="restock-email"
                    className="w-full bg-forge-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip chip-tech">{material}</span>
                  {colors.map((c) => <span key={c} className="chip">{c}</span>)}
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  data-testid="restock-submit"
                  className="btn-forge w-full rounded-full py-5 text-sm"
                >
                  {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Subscribing…</>
                        : <><Bell className="w-4 h-4 mr-2"/> Alert me on restock</>}
                </Button>
                <p className="text-[10px] font-mono uppercase tracking-widest text-forge-faint text-center">
                  One email · no spam · unsubscribe on any alert
                </p>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
