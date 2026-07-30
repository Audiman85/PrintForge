import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Minus, Rocket, Zap } from "lucide-react";

const DEFAULT_PALETTE = [
  "#FF6B00", "#00F0FF", "#EDEDF0", "#5C5C66",
  "#22C55E", "#F59E0B", "#8B5CF6", "#EF4444",
];

export default function PrintConfigurator({ product, onQuoteChange }) {
  const [config, setConfig] = useState(null);
  const [material, setMaterial] = useState(product.material || "PLA");
  const [quality, setQuality] = useState("regular");
  const [nozzle, setNozzle] = useState(0.4);
  const [quantity, setQuantity] = useState(1);
  const [infill, setInfill] = useState(20);
  const [colors, setColors] = useState(
    () => DEFAULT_PALETTE.slice(0, Math.max(1, product.recommended_colors || 1))
  );
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/quote/config"); setConfig(data); } catch {}
    })();
  }, []);

  const params = useMemo(() => ({
    product_id: product.product_id,
    material, quality, nozzle_mm: nozzle,
    colors: colors.length, quantity, infill_pct: infill,
  }), [product.product_id, material, quality, nozzle, colors.length, quantity, infill]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.post("/quote", params);
        if (!cancelled) { setQuote(data); onQuoteChange?.({ quote: data, colors, config: params }); }
      } finally { if (!cancelled) setLoading(false); }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [params, colors, onQuoteChange]);

  const addColor = () => setColors(prev => prev.length >= 8 ? prev : [...prev, DEFAULT_PALETTE[prev.length % DEFAULT_PALETTE.length]]);
  const removeColor = (i) => setColors(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  const changeColor = (i, val) => setColors(prev => prev.map((c, idx) => idx === i ? val : c));

  if (!config) return <div className="card-forge p-6 animate-pulse h-64"/>;

  return (
    <div className="card-forge p-6 space-y-6" data-testid="configurator">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-forge-primary"/>
        <h3 className="font-display text-xl text-forge-text">Configure & quote</h3>
      </div>

      {/* Material */}
      <div>
        <Label className="text-forge-text mb-2 block">Filament type</Label>
        <Select value={material} onValueChange={setMaterial}>
          <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="cfg-material">
            <SelectValue/>
          </SelectTrigger>
          <SelectContent className="bg-forge-surface border-forge-border text-forge-text max-h-72">
            {config.materials.map(m => (
              <SelectItem key={m.name} value={m.name}>
                <span className="flex items-center justify-between gap-4 w-full">
                  <span>{m.name}</span>
                  <span className="font-mono text-xs text-forge-muted">${m.price_per_gram.toFixed(3)}/g</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quality */}
      <div>
        <Label className="text-forge-text mb-2 block">Quality</Label>
        <div className="grid grid-cols-3 gap-2" data-testid="cfg-quality">
          {config.qualities.map(qu => (
            <button
              key={qu.name}
              type="button"
              onClick={()=>setQuality(qu.name)}
              data-testid={`quality-${qu.name}`}
              className={`p-3 rounded-lg text-left transition border ${quality===qu.name ? "border-forge-primary bg-forge-primary/10" : "border-forge-border bg-forge-elevated hover:border-forge-faint"}`}
            >
              <div className="font-display text-forge-text">{qu.label}</div>
              <div className="font-mono text-[10px] text-forge-muted mt-1">Layer {qu.layer_mm}mm</div>
            </button>
          ))}
        </div>
      </div>

      {/* Nozzle */}
      <div>
        <Label className="text-forge-text mb-2 block">Nozzle size</Label>
        <div className="grid grid-cols-4 gap-2" data-testid="cfg-nozzle">
          {config.nozzles.map(n => (
            <button
              key={n.mm}
              type="button"
              onClick={()=>setNozzle(n.mm)}
              data-testid={`nozzle-${n.mm}`}
              className={`p-3 rounded-lg text-center transition border ${nozzle===n.mm ? "border-forge-primary bg-forge-primary/10" : "border-forge-border bg-forge-elevated hover:border-forge-faint"}`}
            >
              <div className="font-display text-forge-text text-lg">{n.mm}<span className="text-xs text-forge-muted ml-1">mm</span></div>
              <div className="font-mono text-[9px] text-forge-muted mt-1">{n.label.split("·")[1]?.trim() || ""}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-forge-text">Colours <span className="font-mono text-xs text-forge-muted">({colors.length} / {config.max_colors})</span></Label>
          <div className="flex gap-1">
            <button type="button" onClick={()=>removeColor(colors.length-1)} disabled={colors.length<=1} className="w-7 h-7 rounded-full border border-forge-border flex items-center justify-center hover:border-forge-primary disabled:opacity-30" data-testid="remove-color-btn"><Minus className="w-3 h-3"/></button>
            <button type="button" onClick={addColor} disabled={colors.length>=8} className="w-7 h-7 rounded-full border border-forge-border flex items-center justify-center hover:border-forge-primary disabled:opacity-30" data-testid="add-color-btn"><Plus className="w-3 h-3"/></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" data-testid="cfg-colors">
          {colors.map((c, i) => (
            <label key={i} className="relative group cursor-pointer" title={`Slot ${i+1}`}>
              <div className="w-10 h-10 rounded-lg border-2 border-forge-border overflow-hidden" style={{background:c}}/>
              <span className="absolute -top-1 -left-1 font-mono text-[9px] text-forge-bg bg-forge-primary rounded-full w-4 h-4 flex items-center justify-center">{i+1}</span>
              <input type="color" value={c} onChange={(e)=>changeColor(i,e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" data-testid={`color-input-${i}`}/>
            </label>
          ))}
        </div>
        {colors.length > 1 && (
          <p className="text-[10px] font-mono text-forge-muted mt-2">+{(colors.length-1)*14}% material + ${((colors.length-1)*1.2).toFixed(2)} swap fee</p>
        )}
      </div>

      {/* Infill */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-forge-text">Infill</Label>
          <span className="font-mono text-sm text-forge-primary" data-testid="infill-value">{infill}%</span>
        </div>
        <Slider value={[infill]} min={5} max={100} step={5} onValueChange={(v)=>setInfill(v[0])} data-testid="infill-slider"/>
      </div>

      {/* Quantity */}
      <div>
        <Label className="text-forge-text mb-2 block">Quantity</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" onClick={()=>setQuantity(q=>Math.max(1,q-1))} className="border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text" data-testid="qty-minus"><Minus className="w-4 h-4"/></Button>
          <Input type="number" min={1} max={50} value={quantity} onChange={(e)=>setQuantity(Math.max(1,Math.min(50,Number(e.target.value)||1)))} className="bg-forge-elevated border-forge-border text-forge-text text-center w-24" data-testid="qty-input"/>
          <Button type="button" variant="outline" size="icon" onClick={()=>setQuantity(q=>Math.min(50,q+1))} className="border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text" data-testid="qty-plus"><Plus className="w-4 h-4"/></Button>
          {quantity >= 5 && <span className="chip chip-tech">-{quantity>=10?"10":"5"}% bulk</span>}
        </div>
      </div>

      {/* Quote panel */}
      <div className="rounded-xl bg-forge-bg border border-forge-border p-5 space-y-3" data-testid="quote-panel">
        {quote ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">Instant Quote</div>
                <div className="font-display text-4xl text-forge-primary font-semibold" data-testid="quote-total">${quote.total_price.toFixed(2)}</div>
                <div className="font-mono text-xs text-forge-muted mt-1">${quote.unit_price.toFixed(2)} × {quote.quantity} + ${quote.breakdown.shipping.toFixed(2)} shipping</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">Print Time</div>
                <div className="font-display text-forge-text text-2xl" data-testid="quote-time">{quote.estimated_time_hours}h</div>
                <div className="font-mono text-xs text-forge-muted mt-1">{quote.estimated_weight_grams}g · {quote.layer_mm}mm layer</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-forge-border font-mono text-xs">
              <Row label="Material" value={`$${quote.breakdown.material_cost.toFixed(2)}`}/>
              <Row label="Machine" value={`$${quote.breakdown.machine_cost.toFixed(2)}`}/>
              <Row label="Colour swap" value={`$${quote.breakdown.colour_cost.toFixed(2)}`}/>
              <Row label="Labour" value={`$${quote.breakdown.labour.toFixed(2)}`}/>
            </div>
            {loading && <div className="font-mono text-[10px] text-forge-tech animate-pulse">Recalculating…</div>}
          </>
        ) : (
          <div className="text-forge-muted text-sm">Calculating quote…</div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-forge-muted uppercase tracking-widest text-[10px]">{label}</span>
      <span className="text-forge-text">{value}</span>
    </div>
  );
}

// helper to feed configurator state up to parent
export function getColorList(state) { return state.colors; }
