import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Truck, Clock, Shield, Leaf, Zap, MapPin, Package as PackageIcon, TrendingDown, Moon, ChevronDown, ChevronUp } from "lucide-react";

// Common subset — includes overnight options
const CARRIER_ORDER = [
  "eco_pickup",
  "usps_ground",
  "ups_ground",
  "usps_priority",
  "fedex_2day",
  "ups_next_air",
  "fedex_overnight",
];

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
          const filtered = res.quotes.filter(q => CARRIER_ORDER.includes(q.carrier_code))
            .sort((a, b) => CARRIER_ORDER.indexOf(a.carrier_code) - CARRIER_ORDER.indexOf(b.carrier_code));
          const cheapest = [...filtered].sort((a,b)=>a.price-b.price)[0]?.carrier_code;
          const fastest = [...filtered].sort((a,b)=>a.days_max-b.days_max)[0]?.carrier_code;
          const overnight = filtered.filter(q => q.days_max === 1);
          const payload = { ...res, quotes: filtered, cheapest_code: cheapest, fastest_code: fastest, overnight };
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
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-forge p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-hidden" data-testid="shipping-quotes">
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
            <div className="flex items-center gap-2 text-[11px] font-mono text-forge-muted truncate">
              <span className="text-forge-text truncate">{selected.carrier_name}</span>
              <span>·</span>
              <span>{daysLabel(selected)}</span>
              <span>·</span>
              <span className="text-forge-primary">${selected.price.toFixed(2)}</span>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-forge-muted">
              {loading ? "Loading rates…" : "Tap to configure destination"}
            </div>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-forge-muted shrink-0"/>
          : <ChevronDown className="w-4 h-4 text-forge-muted shrink-0"/>}
      </button>

      {expanded && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label className="text-forge-text mb-2 block text-xs">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="shipping-country">
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent className="bg-forge-surface border-forge-border text-forge-text max-h-64">
                  {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-forge-text mb-2 flex items-center gap-1 text-xs"><MapPin className="w-3 h-3"/> Postal / ZIP</Label>
              <Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="e.g. 90210" className="bg-forge-elevated border-forge-border text-forge-text" data-testid="shipping-postal"/>
            </div>
          </div>

          <div>
            <Label className="text-forge-text mb-2 block text-xs">Delivery method</Label>
            <Select value={selectedCode || ""} onValueChange={pickByCode} disabled={loading || !data}>
              <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text h-14 py-2" data-testid="shipping-dropdown">
                <SelectValue placeholder={loading ? "Loading rates…" : "Select delivery method"}/>
              </SelectTrigger>
              <SelectContent className="bg-forge-surface border-forge-border text-forge-text max-h-80">
                {data?.quotes.map(q => {
                  const isCheap = q.carrier_code === data.cheapest_code;
                  const isFast = q.carrier_code === data.fastest_code;
                  const isOvernight = q.days_max === 1 && q.days_min <= 1;
                  return (
                    <SelectItem key={q.carrier_code} value={q.carrier_code} data-testid={`opt-${q.carrier_code}`}>
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center font-mono text-[9px] font-bold text-white" style={{background:q.logo_bg}}>{q.logo_label}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display text-forge-text truncate text-sm">{q.carrier_name}</span>
                            {isCheap && <span className="chip chip-tech text-[8px] px-1.5 py-0"><TrendingDown className="w-2 h-2"/> BEST</span>}
                            {isFast && !isCheap && <span className="chip chip-primary text-[8px] px-1.5 py-0"><Zap className="w-2 h-2"/> FAST</span>}
                            {isOvernight && !isFast && <span className="chip chip-primary text-[8px] px-1.5 py-0"><Moon className="w-2 h-2"/> OVERNIGHT</span>}
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-forge-muted mt-0.5">
                            {daysLabel(q)}
                          </div>
                        </div>
                        <div className="font-mono text-forge-primary text-sm sm:text-base font-semibold shrink-0">${q.price.toFixed(2)}</div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="p-3 rounded-lg bg-forge-elevated border border-forge-border space-y-2" data-testid="shipping-selected-detail">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">Selected</div>
                  <div className="font-display text-forge-text text-base truncate">{selected.carrier_name}</div>
                </div>
                <div className="font-mono text-forge-primary text-xl font-semibold shrink-0" data-testid="shipping-price">${selected.price.toFixed(2)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-forge-muted uppercase tracking-widest">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {daysLabel(selected)}</span>
                {selected.tracked && <span className="flex items-center gap-1"><Shield className="w-3 h-3"/> Insured ${selected.insured_up_to}</span>}
                <span className="flex items-center gap-1"><Leaf className="w-3 h-3"/> {selected.carbon_g}g CO₂</span>
              </div>
              {selected.note && <p className="text-[11px] text-forge-muted italic">{selected.note}</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-forge-bg border border-forge-border">
            <div className="flex items-center gap-2">
              <Switch checked={signature} onCheckedChange={setSignature} data-testid="shipping-signature"/>
              <Label className="text-xs sm:text-sm text-forge-text">Signature</Label>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <Shield className="w-4 h-4 text-forge-tech shrink-0"/>
              <Label className="text-xs sm:text-sm text-forge-text whitespace-nowrap">Insured ($)</Label>
              <Input type="number" min={0} value={insuredValue} onChange={(e) => setInsuredValue(e.target.value)} className="bg-forge-elevated border-forge-border text-forge-text h-8 w-20" data-testid="shipping-insured"/>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono text-forge-muted"><PackageIcon className="w-3 h-3"/> {weightGrams}g · {items} item{items>1?"s":""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
