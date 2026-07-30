import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Truck, Clock, Shield, Leaf, Zap, MapPin, Package as PackageIcon, TrendingDown, Moon, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

const COUNTRIES = [
  { code: "US", name: "United States" },
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

const FILTERS = [
  { id: "all",       label: "All" },
  { id: "cheap",     label: "Cheap" },
  { id: "fast",      label: "Fast" },
  { id: "overnight", label: "Overnight" },
  { id: "eco",       label: "Eco" },
];

function daysLabel(q) {
  if (q.days_min === 0 && q.days_max <= 1) return "Same/next day";
  if (q.days_min === 1 && q.days_max === 1) return "Overnight";
  if (q.days_min === q.days_max) return `${q.days_min} day${q.days_min > 1 ? "s" : ""}`;
  return `${q.days_min}–${q.days_max} days`;
}

export default function ShippingQuotes({ weightGrams = 100, items = 1, onSelect, initialCountry = "US" }) {
  const [country, setCountry] = useState(initialCountry);
  const [postal, setPostal] = useState("");
  const [signature, setSignature] = useState(false);
  const [insuredValue, setInsuredValue] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  const req = useMemo(() => ({
    weight_grams: weightGrams, items, country, postal_code: postal,
    signature_required: signature, insured_value: Number(insuredValue) || 0,
  }), [weightGrams, items, country, postal, signature, insuredValue]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: res } = await api.post("/shipping/quotes", req);
        if (!cancelled) {
          const quotes = [...res.quotes].sort((a, b) => a.price - b.price);
          const cheapest = quotes[0]?.carrier_code;
          const fastest = [...quotes].sort((a, b) => a.days_max - b.days_max)[0]?.carrier_code;
          const payload = { ...res, quotes, cheapest_code: cheapest, fastest_code: fastest };
          setData(payload);
          if (!selectedCode && payload.quotes.length) {
            const preferred = payload.quotes.find(q => q.carrier_code === "usps_priority") || payload.quotes[0];
            setSelectedCode(preferred.carrier_code);
            onSelect?.(preferred);
          } else if (selectedCode) {
            const same = payload.quotes.find(q => q.carrier_code === selectedCode);
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

  const filteredQuotes = useMemo(() => {
    if (!data) return [];
    const q = data.quotes;
    if (filter === "cheap")     return [...q].sort((a, b) => a.price - b.price).slice(0, 6);
    if (filter === "fast")      return [...q].sort((a, b) => a.days_max - b.days_max).slice(0, 6);
    if (filter === "overnight") return q.filter(x => x.days_max === 1);
    if (filter === "eco")       return q.filter(x => x.carbon_g <= 40 || x.carrier_code === "eco_pickup" || x.carrier_code === "bike_courier");
    return q;
  }, [data, filter]);

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
              <span>{daysLabel(selected)}</span>
              <span>·</span>
              <span className="text-forge-primary">${selected.price.toFixed(2)}</span>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-forge-muted">
              {loading ? "Loading rates…" : "Tap to compare carriers"}
            </div>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-forge-muted shrink-0"/>
          : <ChevronDown className="w-4 h-4 text-forge-muted shrink-0"/>}
      </button>

      {expanded && (
        <div className="space-y-4 pt-1">
          {/* Destination */}
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

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1" data-testid="shipping-filters">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                data-testid={`shipping-filter-${f.id}`}
                className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest transition ${
                  filter === f.id
                    ? "bg-forge-primary text-forge-bg"
                    : "bg-forge-elevated text-forge-muted hover:text-forge-text"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="shrink-0 ml-auto text-[10px] font-mono text-forge-muted self-center">
              {filteredQuotes.length} option{filteredQuotes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Scrollable radio list */}
          <div
            className="max-h-[320px] overflow-y-auto overflow-x-hidden rounded-lg border border-forge-border bg-forge-bg divide-y divide-forge-border"
            data-testid="shipping-list"
          >
            {loading && !data ? (
              <div className="p-4 text-center text-forge-muted text-sm">Loading rates…</div>
            ) : filteredQuotes.length === 0 ? (
              <div className="p-4 text-center text-forge-muted text-sm">No options match this filter — try "All".</div>
            ) : (
              filteredQuotes.map(q => {
                const isSelected = q.carrier_code === selectedCode;
                const isCheap = q.carrier_code === data?.cheapest_code;
                const isFast = q.carrier_code === data?.fastest_code;
                const isOvernight = q.days_max === 1 && q.days_min <= 1;
                const isGreen = q.carbon_g <= 40 || q.carrier_code === "eco_pickup" || q.carrier_code === "bike_courier";
                return (
                  <button
                    key={q.carrier_code}
                    type="button"
                    onClick={() => pickByCode(q.carrier_code)}
                    data-testid={`opt-${q.carrier_code}`}
                    className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left transition ${
                      isSelected ? "bg-forge-primary/10" : "hover:bg-forge-elevated"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 shrink-0 rounded flex items-center justify-center font-mono text-[9px] font-bold text-white`}
                      style={{ background: q.logo_bg }}
                    >
                      {q.logo_label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm truncate ${isSelected ? "text-forge-primary font-semibold" : "text-forge-text"}`}>{q.carrier_name}</span>
                        {isCheap     && <span className="chip chip-tech text-[8px] px-1.5 py-0"><TrendingDown className="w-2 h-2"/> BEST</span>}
                        {isFast      && !isCheap && <span className="chip chip-primary text-[8px] px-1.5 py-0"><Zap className="w-2 h-2"/> FAST</span>}
                        {isOvernight && !isFast  && <span className="chip chip-primary text-[8px] px-1.5 py-0"><Moon className="w-2 h-2"/> OVERNIGHT</span>}
                        {isGreen     && <span className="chip text-[8px] px-1.5 py-0 border-forge-tech/40 text-forge-tech bg-forge-tech/10"><Leaf className="w-2 h-2"/> ECO</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-forge-muted mt-0.5">
                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5"/>{daysLabel(q)}</span>
                        {q.tracked && <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5"/>tracked</span>}
                        <span className="flex items-center gap-1"><Leaf className="w-2.5 h-2.5"/>{q.carbon_g}g CO₂</span>
                      </div>
                    </div>
                    <div className={`font-mono text-sm sm:text-base font-semibold shrink-0 ${isSelected ? "text-forge-primary" : "text-forge-text"}`}>
                      ${q.price.toFixed(2)}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Extras collapsed */}
          <button
            type="button"
            onClick={() => setShowExtras(v => !v)}
            className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-forge-muted hover:text-forge-text transition"
            data-testid="shipping-extras-toggle"
          >
            <Sparkles className="w-3 h-3"/>
            Extras {showExtras ? "hide" : "show"}
            {showExtras ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
          </button>
          {showExtras && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-forge-bg border border-forge-border" data-testid="shipping-extras">
              <div className="flex items-center gap-2">
                <Switch checked={signature} onCheckedChange={setSignature} data-testid="shipping-signature"/>
                <Label className="text-xs sm:text-sm text-forge-text">Signature</Label>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                <Shield className="w-4 h-4 text-forge-tech shrink-0"/>
                <Label className="text-xs sm:text-sm text-forge-text whitespace-nowrap">Insured ($)</Label>
                <Input type="number" min={0} value={insuredValue} onChange={(e) => setInsuredValue(e.target.value)} className="bg-forge-elevated border-forge-border text-forge-text h-8 w-20" data-testid="shipping-insured"/>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-forge-muted"><PackageIcon className="w-3 h-3"/> {weightGrams}g · {items} item{items > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
