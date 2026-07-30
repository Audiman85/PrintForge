import { useEffect, useState } from "react";
import { BarChart3, Package, HandHeart, Bell, Users, FileBox, Star, Loader2 } from "lucide-react";
import api from "@/lib/api";

const WINDOWS = [
  { id: 7, label: "7d" },
  { id: 30, label: "30d" },
  { id: 90, label: "90d" },
];

const money = (cents) => `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AnalyticsCard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async (d) => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get("/admin/analytics", { params: { days: d } });
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.detail || "Sign in as admin to view analytics");
      setData(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(days); }, [days]);

  return (
    <div className="card-forge p-5 space-y-4" data-testid="analytics-card">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-forge-primary"/>
          <h3 className="font-display text-forge-text text-lg">Analytics</h3>
        </div>
        <div className="inline-flex rounded-full border border-forge-border overflow-hidden" data-testid="analytics-window">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setDays(w.id)}
              data-testid={`analytics-window-${w.id}`}
              className={`px-3 py-1 text-[11px] font-mono uppercase tracking-widest transition ${
                days === w.id ? "bg-forge-primary text-forge-bg" : "text-forge-muted hover:text-forge-text"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-forge-primary animate-spin"/>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed border-forge-border p-6 text-center" data-testid="analytics-error">
          <BarChart3 className="w-6 h-6 text-forge-muted mx-auto mb-2"/>
          <p className="text-sm text-forge-muted">{error}</p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="analytics-stats">
            <Stat icon={Package} label="Paid orders" value={data.orders_paid_count} sub={money(data.orders_paid_cents)}/>
            <Stat icon={HandHeart} label="Donations" value={data.donations_count} sub={money(data.donations_cents)}/>
            <Stat icon={Users} label="New signups" value={data.new_signups}/>
            <Stat icon={FileBox} label="New designs" value={data.new_designs} sub={`${data.new_design_stars} stars`}/>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech mb-2 flex items-center gap-1.5">
                <HandHeart className="w-3 h-3"/> Top donors
              </div>
              {(data.top_donors || []).length === 0 ? (
                <p className="text-xs text-forge-muted font-mono">No donations in this window.</p>
              ) : (
                <ul className="space-y-1.5" data-testid="analytics-donors">
                  {data.top_donors.map((d) => (
                    <li key={d.email} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-forge-text truncate">{d.is_anonymous ? "Anonymous" : (d.name || d.email)}</span>
                      <span className="font-mono text-forge-primary">{money(d.total_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech mb-2 flex items-center gap-1.5">
                <Bell className="w-3 h-3"/> Restock demand
              </div>
              {(data.restock_top || []).length === 0 ? (
                <p className="text-xs text-forge-muted font-mono">No new restock signups.</p>
              ) : (
                <ul className="space-y-1.5" data-testid="analytics-restock">
                  {data.restock_top.map((r) => (
                    <li key={r.material} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-forge-text truncate">{r.material}</span>
                      <span className="font-mono text-forge-tech">{r.subscribers} subs</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-forge-border bg-forge-bg p-3">
      <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-forge-tech mb-1">
        <Icon className="w-3 h-3"/> {label}
      </div>
      <div className="font-display text-forge-text text-xl leading-tight">{value ?? 0}</div>
      {sub && <div className="text-[10px] font-mono text-forge-muted">{sub}</div>}
    </div>
  );
}
