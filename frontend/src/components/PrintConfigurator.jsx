import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Zap, Sparkles, Settings2, Info } from "lucide-react";

const DEFAULT_PALETTE = [
  "#FF6B00", "#00F0FF", "#EDEDF0", "#5C5C66",
  "#22C55E", "#F59E0B", "#8B5CF6", "#EF4444",
];
const BLACK = "#111111";

// Named colour swatches for "restricted" materials so the swatch reflects reality.
const NAMED_COLORS = {
  "Black": "#111111",
  "White": "#EDEDED",
  "Grey":  "#7A7A7F",
};

export default function PrintConfigurator({ product, onQuoteChange }) {
  const [config, setConfig] = useState(null);
  const [advanced, setAdvanced] = useState(false);
  const [material, setMaterial] = useState(product.material || "PLA");
  const [quality, setQuality] = useState("regular");
  const [nozzle, setNozzle] = useState(0.4);
  const [quantity, setQuantity] = useState(1);
  const [infill, setInfill] = useState(20);
  const [colorCount, setColorCount] = useState(Math.max(1, product.recommended_colors || 1));
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

  // Detect material color restriction
  const currentMat = config?.materials.find(m => m.name === material);
  const restrictedTo = currentMat?.available_colors && currentMat.available_colors.length ? currentMat.available_colors : null;

  // Apply restriction when the material changes
  useEffect(() => {
    if (restrictedTo && restrictedTo.length === 1) {
      const only = restrictedTo[0];
      const hex = NAMED_COLORS[only] || BLACK;
      setColorCount(1);
      setColors([hex]);
    }
    // eslint-disable-next-line
  }, [material, restrictedTo?.length]);

  // Sync colors array with colorCount for unrestricted materials
  useEffect(() => {
    if (restrictedTo) return;
    setColors(prev => {
      if (prev.length === colorCount) return prev;
      if (prev.length < colorCount) {
        const add = Array.from({ length: colorCount - prev.length }, (_, i) => DEFAULT_PALETTE[(prev.length + i) % DEFAULT_PALETTE.length]);
        return [...prev, ...add];
      }
      return prev.slice(0, colorCount);
    });
  }, [colorCount, restrictedTo]);

  // Reset to Standard defaults whenever the user leaves Advanced mode
  const applyStandard = () => {
    const s = config?.standard;
    if (!s) return;
    setMaterial(s.material);
    setQuality(s.quality);
    setNozzle(s.nozzle_mm);
    setInfill(s.infill_pct);
    setColorCount(s.colors);
    setColors([DEFAULT_PALETTE[0]]);
  };

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

  const changeColor = (i, val) => setColors(prev => prev.map((c, idx) => idx === i ? val : c));

  if (!config) return <div className="card-forge p-6 animate-pulse h-64"/>;

  const qualityOptions = [
    { name: "regular", label: "Standard" },
    { name: "hi",      label: "High Quality" },
    { name: "draft",   label: "Draft" },
  ];

  return (
    <div className="card-forge p-6 space-y-5" data-testid="configurator">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-forge-primary"/>
        <h3 className="font-display text-xl text-forge-text">Configure & quote</h3>
      </div>

      {/* One-click Standard card */}
      <button
        type="button"
        onClick={applyStandard}
        data-testid="one-click-standard"
        className="w-full text-left p-4 rounded-xl border border-forge-primary/40 bg-gradient-to-br from-forge-primary/10 to-forge-tech/5 hover:border-forge-primary hover:from-forge-primary/15 transition group"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-forge-primary"/>
              <span className="font-display text-forge-text text-lg">One-click Standard</span>
              <span className="chip chip-primary text-[9px]">RECOMMENDED</span>
            </div>
            <p className="text-sm text-forge-muted leading-relaxed">
              {config.standard.description || "We handle every small detail — PLA · Standard quality · 0.4mm nozzle · 20% infill · 1 colour. Best quality-to-price for most prints."}
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-forge-primary shrink-0 mt-1">USE →</span>
        </div>
      </button>

      {/* Advanced toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-forge-elevated border border-forge-border">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-forge-tech"/>
          <Label className="text-forge-text text-sm">Advanced settings</Label>
          <span className="font-mono text-[10px] text-forge-muted uppercase tracking-widest">material · quality · nozzle · colours</span>
        </div>
        <Switch checked={advanced} onCheckedChange={setAdvanced} data-testid="advanced-toggle"/>
      </div>

      {advanced && (
        <div className="space-y-5" data-testid="advanced-panel">
          {/* Material dropdown */}
          <div>
            <Label className="text-forge-text mb-2 block">Filament type</Label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="cfg-material"><SelectValue/></SelectTrigger>
              <SelectContent className="bg-forge-surface border-forge-border text-forge-text max-h-72">
                {config.materials.map(m => (
                  <SelectItem key={m.name} value={m.name} data-testid={`material-opt-${m.name}`}>
                    <span className="flex items-center justify-between gap-4 w-full">
                      <span className="flex items-center gap-2">
                        {m.name}
                        {m.single_colour_only && <span className="chip text-[8px]">{m.available_colors?.[0]?.toUpperCase()} ONLY</span>}
                      </span>
                      <span className="font-mono text-xs text-forge-muted">${m.price_per_gram.toFixed(3)}/g</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {restrictedTo && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] font-mono text-forge-tech" data-testid="material-restriction-note">
                <Info className="w-3 h-3 mt-0.5 shrink-0"/>
                <span>Currently stocked in {restrictedTo.join(" / ")} only — extra colours coming soon.</span>
              </p>
            )}
          </div>

          {/* Quality dropdown */}
          <div>
            <Label className="text-forge-text mb-2 block">Quality</Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="cfg-quality"><SelectValue/></SelectTrigger>
              <SelectContent className="bg-forge-surface border-forge-border text-forge-text">
                {qualityOptions.map(qu => {
                  const meta = config.qualities.find(x => x.name === qu.name);
                  return (
                    <SelectItem key={qu.name} value={qu.name} data-testid={`quality-opt-${qu.name}`}>
                      <span className="flex items-center justify-between gap-4 w-full">
                        <span>{qu.label}</span>
                        <span className="font-mono text-xs text-forge-muted">{meta?.layer_mm}mm layer</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Nozzle dropdown */}
          <div>
            <Label className="text-forge-text mb-2 block">Nozzle size</Label>
            <Select value={String(nozzle)} onValueChange={(v)=>setNozzle(Number(v))}>
              <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="cfg-nozzle"><SelectValue/></SelectTrigger>
              <SelectContent className="bg-forge-surface border-forge-border text-forge-text">
                {config.nozzles.map(n => (
                  <SelectItem key={n.mm} value={String(n.mm)} data-testid={`nozzle-opt-${n.mm}`}>
                    {n.mm}mm — {n.label.split("·")[1]?.trim() || n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Colours */}
          <div>
            <Label className="text-forge-text mb-2 block">Colours</Label>
            <Select
              value={String(colorCount)}
              onValueChange={(v)=>setColorCount(Number(v))}
              disabled={!!restrictedTo}
            >
              <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text disabled:opacity-60" data-testid="cfg-colors"><SelectValue/></SelectTrigger>
              <SelectContent className="bg-forge-surface border-forge-border text-forge-text max-h-72">
                {[1,2,3,4,5,6,7,8].map(n => (
                  <SelectItem key={n} value={String(n)} data-testid={`colors-opt-${n}`}>
                    {n} colour{n > 1 ? "s" : ""}
                    {n === 1 ? " — single-colour print" : ` — multi-material (+${(n-1)*14}% + $${((n-1)*1.2).toFixed(2)})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-3" data-testid="color-swatches">
              {colors.map((c, i) => (
                <label key={i} className={`relative group ${restrictedTo ? "cursor-not-allowed" : "cursor-pointer"}`} title={restrictedTo ? `Stocked colour: ${restrictedTo[0]}` : `Slot ${i+1}`}>
                  <div className="w-10 h-10 rounded-lg border-2 border-forge-border" style={{background:c}}/>
                  <span className="absolute -top-1 -left-1 font-mono text-[9px] text-forge-bg bg-forge-primary rounded-full w-4 h-4 flex items-center justify-center">{i+1}</span>
                  <input
                    type="color"
                    value={c}
                    onChange={(e)=>changeColor(i,e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={!!restrictedTo}
                    data-testid={`color-input-${i}`}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quantity — always visible outside Advanced too */}
      <div>
        <Label className="text-forge-text mb-2 block">Quantity</Label>
        <Select value={String(quantity)} onValueChange={(v)=>setQuantity(Number(v))}>
          <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="cfg-quantity"><SelectValue/></SelectTrigger>
          <SelectContent className="bg-forge-surface border-forge-border text-forge-text max-h-72">
            {[1,2,3,4,5,10,15,20,25,30,40,50].map(n => (
              <SelectItem key={n} value={String(n)} data-testid={`qty-opt-${n}`}>
                {n} unit{n > 1 ? "s" : ""}
                {n >= 10 ? " · –10% bulk" : n >= 5 ? " · –5% bulk" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Infill only in advanced */}
      {advanced && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-forge-text">Infill</Label>
            <span className="font-mono text-sm text-forge-primary" data-testid="infill-value">{infill}%</span>
          </div>
          <Slider value={[infill]} min={5} max={100} step={5} onValueChange={(v)=>setInfill(v[0])} data-testid="infill-slider"/>
        </div>
      )}

      {/* Quote panel */}
      <div className="rounded-xl bg-forge-bg border border-forge-border p-5 space-y-3" data-testid="quote-panel">
        {quote ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">Instant Quote</div>
                <div className="font-display text-4xl text-forge-primary font-semibold" data-testid="quote-total">${quote.total_price.toFixed(2)}</div>
                <div className="font-mono text-xs text-forge-muted mt-1">${quote.unit_price.toFixed(2)} × {quote.quantity} + ${quote.breakdown.shipping.toFixed(2)} handling</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">Print Time</div>
                <div className="font-display text-forge-text text-2xl" data-testid="quote-time">{quote.estimated_time_hours}h</div>
                <div className="font-mono text-xs text-forge-muted mt-1">{quote.estimated_weight_grams}g · {quote.layer_mm}mm</div>
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
