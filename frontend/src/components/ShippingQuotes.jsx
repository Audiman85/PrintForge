import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Truck, Clock, Shield, Leaf, Zap, MapPin, Package as PackageIcon, Check, TrendingDown } from "lucide-react";

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

export default function ShippingQuotes({ weightGrams = 100, items = 1, onSelect, initialCountry = "US" }) {
  const [country, setCountry] = useState(initialCountry);
  const [postal, setPostal] = useState("");
  const [signature, setSignature] = useState(false);
  const [insuredValue, setInsuredValue] = useState(0);
  const [quotes, setQuotes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const req = useMemo(() => ({
    weight_grams: weightGrams,
    items,
    country,
    postal_code: postal,
    signature_required: signature,
    insured_value: Number(insuredValue) || 0,
  }), [weightGrams, items, country, postal, signature, insuredValue]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.post("/shipping/quotes", req);
        if (!cancelled) {
          setQuotes(data);
          if (!selected && data.quotes?.length) {
            const s = data.quotes.find(q => q.carrier_code === data.cheapest_code) || data.quotes[0];
            setSelected(s.carrier_code);
            onSelect?.(s);
          }
        }
      } finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line
  }, [req]);

  const pick = (q) => { setSelected(q.carrier_code); onSelect?.(q); };

  return (
    <div className="card-forge p-6 space-y-5" data-testid="shipping-quotes">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-forge-primary"/>
        <h3 className="font-display text-xl text-forge-text">Get shipping quotes</h3>
      </div>

      {/* Destination */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <Label className="text-forge-text mb-2 block">Country</Label>
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
          <Label className="text-forge-text mb-2 block flex items-center gap-1"><MapPin className="w-3 h-3"/> Postal / ZIP</Label>
          <Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="e.g. 90210" className="bg-forge-elevated border-forge-border text-forge-text" data-testid="shipping-postal"/>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-forge-elevated border border-forge-border">
        <div className="flex items-center gap-2">
          <Switch checked={signature} onCheckedChange={setSignature} data-testid="shipping-signature"/>
          <Label className="text-sm text-forge-text">Signature on delivery</Label>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Shield className="w-4 h-4 text-forge-tech"/>
          <Label className="text-sm text-forge-text whitespace-nowrap">Insured value ($)</Label>
          <Input
            type="number" min={0} value={insuredValue}
            onChange={(e) => setInsuredValue(e.target.value)}
            className="bg-forge-bg border-forge-border text-forge-text h-8 w-24"
            data-testid="shipping-insured"
          />
        </div>
      </div>

      {/* Package meta */}
      <div className="flex items-center gap-4 text-xs font-mono text-forge-muted">
        <span className="flex items-center gap-1"><PackageIcon className="w-3 h-3"/> {weightGrams}g</span>
        <span>·</span>
        <span>{items} item{items>1?"s":""}</span>
        {quotes && (<>
          <span>·</span>
          <span className="text-forge-tech uppercase">Zone: {quotes.destination_zone}</span>
        </>)}
      </div>

      {/* Quotes list */}
      <div className="space-y-2" data-testid="shipping-list">
        {loading && !quotes ? (
          <>{[...Array(4)].map((_,i)=><div key={i} className="h-16 rounded-lg bg-forge-elevated animate-pulse"/>)}</>
        ) : quotes?.quotes?.map(q => {
          const isSelected = selected === q.carrier_code;
          const isCheapest = q.carrier_code === quotes.cheapest_code;
          const isFastest = q.carrier_code === quotes.fastest_code;
          return (
            <button
              key={q.carrier_code}
              type="button"
              onClick={() => pick(q)}
              data-testid={`carrier-${q.carrier_code}`}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${isSelected ? "border-forge-primary bg-forge-primary/5" : "border-forge-border bg-forge-elevated hover:border-forge-faint"}`}
            >
              <div className="w-11 h-11 rounded shrink-0 flex items-center justify-center font-mono text-[10px] font-bold text-white" style={{background: q.logo_bg}}>
                {q.logo_label}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-forge-text truncate">{q.carrier_name}</span>
                  {isCheapest && <span className="chip chip-tech text-[9px]"><TrendingDown className="w-2.5 h-2.5"/> CHEAPEST</span>}
                  {isFastest && !isCheapest && <span className="chip chip-primary text-[9px]"><Zap className="w-2.5 h-2.5"/> FASTEST</span>}
                  {!q.tracked && <span className="chip text-[9px]">NO TRACKING</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 font-mono text-[10px] text-forge-muted uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5"/> {q.days_min === q.days_max ? `${q.days_min}d` : `${q.days_min}-${q.days_max}d`}</span>
                  {q.tracked && <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5"/> Insured ${q.insured_up_to}</span>}
                  <span className="flex items-center gap-1"><Leaf className="w-2.5 h-2.5"/> {q.carbon_g}gCO₂</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-forge-primary text-lg font-semibold">${q.price.toFixed(2)}</div>
                {isSelected && <Check className="w-4 h-4 text-forge-tech ml-auto mt-1"/>}
              </div>
            </button>
          );
        })}
      </div>
      {quotes && (
        <p className="text-[10px] font-mono text-forge-muted uppercase tracking-widest">
          Live estimates · rates recalculate as you change destination, weight, or options
        </p>
      )}
    </div>
  );
}
