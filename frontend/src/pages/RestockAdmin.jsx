import { useEffect, useState } from "react";
import { Bell, Send, Loader2, Users, Mail, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export default function RestockAdmin() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [notifyForm, setNotifyForm] = useState({ material: "", colors: [], note: "" });
  const [notifying, setNotifying] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/restock/stats");
      setStats(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Sign in as admin to view restock stats");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNotify = (material, colour = null) => {
    setNotifyForm({
      material,
      colors: colour ? [colour] : [],
      note: colour ? `${colour} is back in stock — order in your favourite colour.` : `${material} is fully restocked.`,
    });
    // scroll to notify form
    setTimeout(() => document.getElementById("restock-notify-form")?.scrollIntoView({ block: "center" }), 50);
  };

  const submitNotify = async (e) => {
    e.preventDefault();
    if (!notifyForm.material.trim()) {
      toast.error("Pick a material first");
      return;
    }
    setNotifying(true);
    try {
      const { data } = await api.post("/restock/notify", notifyForm);
      setLastResult(data);
      toast.success(
        data.email_provider_configured
          ? `Notified ${data.sent} / ${data.matched} subscribers`
          : `Queued ${data.queued} notifications (add RESEND_API_KEY to send)`
      );
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Notify failed");
    } finally {
      setNotifying(false);
    }
  };

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-forge-primary"/>
    </div>
  );

  if (!stats) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <Bell className="w-10 h-10 text-forge-muted mx-auto mb-3"/>
      <h1 className="font-display text-forge-text text-2xl mb-2">Sign in required</h1>
      <p className="text-forge-muted text-sm">This page is for admins — please sign in with a maker account.</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16" data-testid="restock-admin">
      <div className="flex items-center gap-3 mb-3">
        <div className="scanline w-12"/>
        <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-forge-tech">Admin · Restock</span>
      </div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-semibold text-forge-text text-3xl sm:text-4xl leading-tight">
            Restock <span className="text-forge-primary">subscribers</span>.
          </h1>
          <p className="text-forge-muted mt-2 text-sm sm:text-base max-w-2xl">
            Everyone who wants a ping the moment ABS, ASA, Silk-PLA and friends come back. Fire the notify button when the spools land.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="card-forge px-4 py-3 min-w-[140px]" data-testid="stat-total">
            <div className="font-mono text-[9px] uppercase tracking-widest text-forge-tech">Total</div>
            <div className="font-display text-forge-text text-2xl leading-none mt-1">{stats.total_subscribers}</div>
          </div>
          <div className="card-forge px-4 py-3 min-w-[140px]" data-testid="stat-email">
            <div className="font-mono text-[9px] uppercase tracking-widest text-forge-tech">Email</div>
            <div className="font-display text-forge-text text-sm leading-none mt-1">
              {stats.email_provider_configured
                ? <span className="text-forge-primary">Live via Resend</span>
                : <span className="text-forge-muted">Queue only</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10" data-testid="restock-materials">
        {stats.materials.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-forge-border p-10 text-center" data-testid="restock-empty">
            <Bell className="w-8 h-8 text-forge-muted mx-auto mb-2"/>
            <div className="font-display text-forge-text">No subscribers yet.</div>
            <p className="text-forge-muted text-sm">The bell appears on out-of-stock filament swatches — subscribers land here.</p>
          </div>
        ) : (
          stats.materials.map((m) => (
            <div key={m.material} className="card-forge p-5 space-y-3" data-testid={`mat-card-${m.material}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-forge-tech">Material</div>
                  <div className="font-display text-forge-text text-xl">{m.material}</div>
                </div>
                <div className="flex items-center gap-1 chip chip-primary">
                  <Users className="w-3 h-3"/> {m.subscribers}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.colours.length === 0 ? (
                  <span className="text-[11px] font-mono text-forge-muted">Any colour</span>
                ) : (
                  m.colours.slice(0, 6).map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => openNotify(m.material, c.name)}
                      title={`Notify ${c.count} subscriber${c.count > 1 ? "s" : ""} of ${c.name} restock`}
                      className="chip hover:bg-forge-primary hover:text-forge-bg transition"
                      data-testid={`mat-col-${m.material}-${c.name}`}
                    >
                      {c.name} · {c.count}
                    </button>
                  ))
                )}
              </div>
              <Button
                onClick={() => openNotify(m.material)}
                className="btn-forge w-full rounded-full py-4 text-sm"
                data-testid={`mat-notify-${m.material}`}
              >
                <Send className="w-4 h-4 mr-2"/> Notify {m.material} is back
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Notify form */}
      <form
        id="restock-notify-form"
        onSubmit={submitNotify}
        className="card-forge p-6 space-y-4"
        data-testid="notify-form"
      >
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-forge-primary"/>
          <h2 className="font-display text-forge-text text-xl">Send a restock alert</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-forge-muted mb-1.5 block">Material</label>
            <input
              type="text"
              value={notifyForm.material}
              onChange={(e) => setNotifyForm({ ...notifyForm, material: e.target.value })}
              placeholder="ABS, ASA, Silk-PLA…"
              className="w-full bg-forge-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
              data-testid="notify-material"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-mono uppercase tracking-widest text-forge-muted mb-1.5 block">Colours (comma-separated, leave blank for any)</label>
            <input
              type="text"
              value={notifyForm.colors.join(", ")}
              onChange={(e) => setNotifyForm({ ...notifyForm, colors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="Black, Grey"
              className="w-full bg-forge-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
              data-testid="notify-colors"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-forge-muted mb-1.5 block">Message (optional)</label>
          <textarea
            value={notifyForm.note}
            onChange={(e) => setNotifyForm({ ...notifyForm, note: e.target.value })}
            rows={2}
            className="w-full bg-forge-elevated border border-forge-border rounded-lg px-3 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
            data-testid="notify-note"
          />
        </div>
        <Button
          type="submit"
          disabled={notifying}
          className="btn-forge w-full sm:w-auto rounded-full px-6 py-4"
          data-testid="notify-submit"
        >
          {notifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Sending…</>
                     : <><Send className="w-4 h-4 mr-2"/> Send restock alert</>}
        </Button>
        {lastResult && (
          <div className="rounded-lg border border-forge-border bg-forge-bg p-3 text-sm text-forge-muted flex items-center gap-2" data-testid="notify-result">
            <CheckCircle2 className="w-4 h-4 text-forge-primary"/>
            Matched <b className="text-forge-text">{lastResult.matched}</b>, sent <b className="text-forge-text">{lastResult.sent}</b>, queued <b className="text-forge-text">{lastResult.queued}</b>.
          </div>
        )}
      </form>

      {/* Recent notifications */}
      {stats.recent_notifications?.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-forge-text text-xl mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-forge-tech"/> Recent alerts
          </h2>
          <div className="card-forge p-4 divide-y divide-forge-border" data-testid="recent-notifs">
            {stats.recent_notifications.slice(0, 12).map((n) => (
              <div key={n.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
                <span className="chip chip-tech">{n.material}</span>
                <span className="text-forge-text">{n.email}</span>
                {(n.colors || []).length > 0 && <span className="text-forge-muted">{(n.colors || []).join(", ")}</span>}
                <span className={`ml-auto uppercase tracking-widest text-[10px] ${n.outcome === "sent" ? "text-forge-primary" : "text-forge-muted"}`}>{n.outcome}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
