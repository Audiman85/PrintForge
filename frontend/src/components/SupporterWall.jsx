import { useEffect, useState } from "react";
import { HandHeart, Sparkles } from "lucide-react";
import api from "@/lib/api";

export default function SupporterWall({ onDonate }) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get("/supporters", { params: { limit: 24 } });
      setItems(data.supporters || []);
      setCount(data.count || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const named = items.filter((s) => !s.is_anonymous && s.name);
  const anonCount = items.filter((s) => s.is_anonymous || !s.name).length;

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14"
      data-testid="supporter-wall"
    >
      <div className="relative overflow-hidden rounded-2xl border border-forge-border bg-forge-surface p-6 sm:p-8 md:p-12 noise-panel">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-forge-primary/15 blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-forge-tech/10 blur-3xl pointer-events-none"/>
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="scanline w-12 sm:w-16"/>
              <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-forge-tech">Supporter Wall</span>
            </div>
            <h2 className="font-display font-semibold text-forge-text text-2xl sm:text-3xl lg:text-4xl">
              Powered by generous <span className="text-forge-primary">makers</span>.
            </h2>
            <p className="text-forge-muted text-sm sm:text-base mt-2 max-w-xl">
              Every tip keeps the filament spooling. Add your name below — or drop by anonymously.
            </p>
          </div>
          <button
            type="button"
            onClick={onDonate}
            data-testid="supporter-wall-donate"
            className="self-start md:self-end inline-flex items-center gap-2 btn-forge rounded-full px-5 py-3 text-sm"
          >
            <HandHeart className="w-4 h-4"/> Add your name
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" data-testid="supporter-wall-loading">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-forge-elevated animate-pulse"/>
            ))}
          </div>
        ) : count === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-forge-border p-8 text-center"
            data-testid="supporter-wall-empty"
          >
            <Sparkles className="w-6 h-6 text-forge-primary mx-auto mb-2"/>
            <div className="font-display text-forge-text text-lg">Be the first supporter.</div>
            <p className="text-forge-muted text-sm mt-1">
              Your name will lead the wall — pick any amount from $1 up.
            </p>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
              data-testid="supporter-wall-grid"
            >
              {named.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-forge-border bg-forge-elevated px-3 py-3 flex items-start gap-3"
                  data-testid={`supporter-card-${s.id}`}
                >
                  <div className="w-9 h-9 shrink-0 rounded-full bg-forge-primary/20 border border-forge-primary/40 flex items-center justify-center font-display text-forge-primary">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-sm text-forge-text truncate">{s.name}</div>
                    {s.message && (
                      <div className="text-[11px] text-forge-muted truncate">"{s.message}"</div>
                    )}
                  </div>
                </div>
              ))}
              {anonCount > 0 && (
                <div
                  className="rounded-xl border border-dashed border-forge-border bg-transparent px-3 py-3 flex items-center gap-3"
                  data-testid="supporter-anonymous-tile"
                >
                  <div className="w-9 h-9 shrink-0 rounded-full bg-forge-tech/15 border border-forge-tech/40 flex items-center justify-center">
                    <HandHeart className="w-4 h-4 text-forge-tech"/>
                  </div>
                  <div>
                    <div className="font-display text-sm text-forge-text">+{anonCount} anonymous</div>
                    <div className="text-[11px] text-forge-muted">Quietly keeping the lights on</div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-forge-muted">
              <span className="text-forge-primary">{count}</span> total supporter{count === 1 ? "" : "s"}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
