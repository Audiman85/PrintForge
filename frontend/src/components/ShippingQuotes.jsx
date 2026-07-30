import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Truck, ChevronDown, ChevronUp, Check, MapPin } from "lucide-react";

const COUNTRIES = [
  { code: "US", name: "USA" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "AU", name: "Australia" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
];

function speedLabel(q) {
  if (q.days_min === 0 && q.days_max <= 1) return "Same/next day";
  if (q.days_min === 1 && q.days_max === 1) return "Next day";
  if (q.days_min === q.days_max) return `${q.days_min} day${q.days_min > 1 ? "s" : ""}`;
  return `${q.days_min}–${q.days_max} days`;
}

export default function ShippingQuotes({ weightGrams = 100, items = 1, onSelect, initialCountry = "US" }) {
  const [country, setCountry] = useState(initialCountry);
  const [postal, setPostal] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const req = useMemo(() => ({
    weight_grams: weightGrams, items, country, postal_code: postal,
    signature_required: false, insured_value: 0,
  }), [weightGrams, items, country, postal]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: res } = await api.post("/shipping/quotes", req);
        if (!cancelled) {
          const quotes = [...res.quotes].sort((a, b) => a.price - b.price);
          setData({ ...res, quotes });
          if (!selectedCode && quotes.length) {
            const preferred = quotes.find(q => q.carrier_code === "usps_priority") || quotes[0];
            setSelectedCode(preferred.carrier_code);
            onSelect?.(preferred);
          } else if (selectedCode) {
            const same = quotes.find(q => q.carrier_code === selectedCode);
            if (same) onSelect?.(same);
          }
        }
      } finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line
  }, [req]);

  const pickByCode = (code) => {
    setSelectedCode(code);
    const q = data?.quotes.find(x => x.carrier_code === code);
    if (q) onSelect?.(q);
  };

  const selected = data?.quotes.find(q => q.carrier_code === selectedCode);

  return (
    <div className="card-forge p-4 sm:p-5 space-y-3 overflow-hidden" data-testid="shipping-quotes">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 text-left"
        data-testid="shipping-toggle"
      >
        <Truck className="w-4 h-4 text-forge-primary shrink-0"/>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-forge-text text-base sm:text-lg leading-tight truncate">Shipping</h3>
          {selected ? (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-forge-muted truncate">
              <span className="text-forge-text truncate">{selected.carrier_name}</span>
              <span>·</span>
              <span>{speedLabel(selected)}</span>
              <span>·</span>
              <span className="text-forge-primary">${selected.price.toFixed(2)}</span>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-forge-muted">
              {loading ? "Loading rates…" : "Tap to see options"}
            </div>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-forge-muted shrink-0"/>
          : <ChevronDown className="w-4 h-4 text-forge-muted shrink-0"/>}
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Label className="text-forge-text mb-1.5 block text-xs">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text h-9 text-xs" data-testid="shipping-country">
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent className="bg-forge-surface border-forge-border text-forge-text max-h-64">
                  {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-forge-text mb-1.5 flex items-center gap-1 text-xs"><MapPin className="w-3 h-3"/> Postal / ZIP</Label>
              <Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="e.g. 90210" className="bg-forge-elevated border-forge-border text-forge-text h-9 text-xs" data-testid="shipping-postal"/>
            </div>
          </div>

          <div className="rounded-lg border border-forge-border bg-forge-bg divide-y divide-forge-border overflow-hidden" data-testid="shipping-list">
            {loading && !data ? (
              <div className="p-4 text-center text-forge-muted text-sm">Loading rates…</div>
            ) : (data?.quotes || []).length === 0 ? (
              <div className="p-4 text-center text-forge-muted text-sm">No options for this destination.</div>
            ) : (
              data.quotes.map(q => {
                const isSelected = q.carrier_code === selectedCode;
                return (
                  <button
                    key={q.carrier_code}
                    type="button"
                    onClick={() => pickByCode(q.carrier_code)}
                    data-testid={`opt-${q.carrier_code}`}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left transition ${
                      isSelected ? "bg-forge-primary/10" : "hover:bg-forge-elevated"
                    }`}
                  >
                    <div
                      className="w-10 h-10 shrink-0 rounded flex items-center justify-center font-mono text-[10px] font-bold text-white"
                      style={{ background: q.logo_bg }}
                    >
                      {q.logo_label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${isSelected ? "text-forge-primary font-semibold" : "text-forge-text"}`}>{q.carrier_name}</div>
                      <div className="text-[11px] font-mono text-forge-muted mt-0.5 truncate">{speedLabel(q)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`font-mono text-base font-semibold ${isSelected ? "text-forge-primary" : "text-forge-text"}`}>
                        ${q.price.toFixed(2)}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-forge-primary"/>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
