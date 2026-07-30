import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Calculator, Zap, Wrench, TrendingUp, Info, RotateCcw } from "lucide-react";

/*
  Admin-side "Product Calculator" that follows the industry-standard
  3D-print-shop pricing model:

  material_cost        = weight_g * price_per_gram
  electricity_cost     = print_time_h * power_kW * electricity_rate ($/kWh)
  machine_depreciation = print_time_h * (printer_cost / lifetime_hours)
  labor_cost           = ((setup_min + post_min) / 60) * labor_rate_per_hour

  subtotal             = material + electricity + depreciation + labor
  failure_buffer       = subtotal * (failure_rate_pct / 100)
  overhead             = (subtotal + failure_buffer) * (overhead_pct / 100)
  cost_basis           = subtotal + failure_buffer + overhead
  markup               = cost_basis * (margin_pct / 100)
  suggested_retail     = cost_basis + markup

  Also offers the classic "3× material" quick method used by many small shops.
*/

const MATERIAL_PRICES = {
  "PLA": 0.05, "PETG": 0.06, "ABS": 0.055, "TPU": 0.09,
  "Silk-PLA": 0.075, "Carbon-PLA": 0.13, "ASA": 0.085, "Carbon-PETG": 0.14,
};

const DEFAULTS = {
  weight_g: 60,
  print_time_h: 4,
  material: "PLA",
  electricity_rate: 0.15,       // USD per kWh (US avg 2026)
  power_kw: 0.15,               // 150W typical FDM
  printer_cost: 799,            // AnyCubic Kobra S1 estimate
  printer_lifetime_h: 3000,     // conservative lifetime
  setup_min: 8,
  post_min: 10,
  labor_rate: 25,               // USD/h (US 3D print shop avg)
  design_fee: 0,                // one-off design/CAD fee amortized over run_size
  run_size: 1,                  // for design-fee amortization
  packaging_cost: 1.25,         // box + foam + label
  failure_pct: 8,               // 8% failure buffer (industry avg)
  overhead_pct: 10,             // shop overhead
  margin_pct: 70,               // healthy retail margin
  payment_fee_pct: 2.9,         // Stripe / card processor
  payment_fee_fixed: 0.30,      // Stripe fixed fee per transaction
};

export default function ProductCalculator({ onApply }) {
  const [f, setF] = useState(DEFAULTS);
  const [method, setMethod] = useState("standard"); // "standard" | "three_x"
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const reset = () => setF(DEFAULTS);

  const calc = useMemo(() => {
    const pricePerG = MATERIAL_PRICES[f.material] ?? 0.05;
    const material_cost = f.weight_g * pricePerG;
    const electricity_cost = f.print_time_h * f.power_kw * f.electricity_rate;
    const depreciation = f.print_time_h * (f.printer_cost / Math.max(1, f.printer_lifetime_h));
    const labor_cost = ((f.setup_min + f.post_min) / 60) * f.labor_rate;
    const design_amortized = (Number(f.design_fee) || 0) / Math.max(1, Number(f.run_size) || 1);
    const packaging = Number(f.packaging_cost) || 0;
    const subtotal = material_cost + electricity_cost + depreciation + labor_cost + design_amortized + packaging;
    const failure_buffer = subtotal * (f.failure_pct / 100);
    const overhead = (subtotal + failure_buffer) * (f.overhead_pct / 100);
    const cost_basis = subtotal + failure_buffer + overhead;
    const markup = cost_basis * (f.margin_pct / 100);
    const pre_processing = cost_basis + markup;
    // Payment processor fee: solve so seller nets pre_processing after (pct + fixed)
    // net = price*(1 - pct/100) - fixed  =>  price = (net + fixed) / (1 - pct/100)
    const pct = (Number(f.payment_fee_pct) || 0) / 100;
    const fixed = Number(f.payment_fee_fixed) || 0;
    const standard_price = (pre_processing + fixed) / Math.max(0.01, 1 - pct);
    const processing_fee = standard_price - pre_processing;
    const three_x = material_cost * 3 + f.print_time_h * 2 + labor_cost + packaging;
    const suggested = method === "three_x" ? three_x : standard_price;
    const margin_dollars = suggested - cost_basis - processing_fee;
    const margin_pct_real = (markup / Math.max(0.01, suggested)) * 100;
    return {
      material_cost, electricity_cost, depreciation, labor_cost,
      design_amortized, packaging, processing_fee,
      subtotal, failure_buffer, overhead, cost_basis, markup,
      standard_price, three_x, suggested, margin_dollars, margin_pct_real,
    };
  }, [f, method]);

  const applyToForm = () => onApply?.(Number(calc.suggested.toFixed(2)));

  return (
    <div className="card-forge p-6 space-y-5" data-testid="product-calculator">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-forge-primary"/>
          <h3 className="font-display text-forge-text text-xl">Pricing calculator</h3>
        </div>
        <button type="button" onClick={reset} className="text-xs font-mono uppercase tracking-widest text-forge-muted hover:text-forge-primary flex items-center gap-1" data-testid="calc-reset">
          <RotateCcw className="w-3 h-3"/> Reset
        </button>
      </div>
      <p className="text-xs text-forge-muted -mt-1">
        Industry-standard 3D print shop formula — material, machine, labour, failure buffer, overhead and margin.
      </p>

      {/* Method chips */}
      <div className="flex gap-2" data-testid="calc-method">
        {[
          { code: "standard", label: "Full breakdown", icon: TrendingUp },
          { code: "three_x",  label: "Quick 3× material", icon: Zap },
        ].map(m => {
          const Icon = m.icon;
          return (
            <button
              key={m.code}
              type="button"
              onClick={() => setMethod(m.code)}
              data-testid={`calc-method-${m.code}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest border transition ${method === m.code ? "bg-forge-primary text-forge-bg border-forge-primary" : "bg-forge-elevated text-forge-muted border-forge-border hover:text-forge-text"}`}
            >
              <Icon className="w-3 h-3"/> {m.label}
            </button>
          );
        })}
      </div>

      {/* Print inputs */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (g)"       value={f.weight_g}      onChange={(v)=>set("weight_g", Number(v)||0)}       testid="calc-weight"/>
        <Field label="Print time (h)"   value={f.print_time_h}  onChange={(v)=>set("print_time_h", Number(v)||0)}   step="0.5" testid="calc-time"/>
        <div className="col-span-2">
          <Label className="text-forge-text mb-2 block">Material</Label>
          <Select value={f.material} onValueChange={(v)=>set("material", v)}>
            <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="calc-material"><SelectValue/></SelectTrigger>
            <SelectContent className="bg-forge-surface border-forge-border text-forge-text">
              {Object.entries(MATERIAL_PRICES).map(([m, p]) => (
                <SelectItem key={m} value={m}>{m} — ${p.toFixed(3)}/g</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Machine & labor */}
      {method === "standard" && (
        <>
          <SectionTitle icon={Zap} label="Machine & energy"/>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Power (kW)"           value={f.power_kw}            onChange={(v)=>set("power_kw", Number(v)||0)}         step="0.01" testid="calc-power"/>
            <Field label="Electricity ($/kWh)"  value={f.electricity_rate}    onChange={(v)=>set("electricity_rate", Number(v)||0)} step="0.01" testid="calc-elec"/>
            <Field label="Printer cost ($)"     value={f.printer_cost}        onChange={(v)=>set("printer_cost", Number(v)||0)}     step="10"   testid="calc-printer-cost"/>
            <Field label="Lifetime (hours)"     value={f.printer_lifetime_h}  onChange={(v)=>set("printer_lifetime_h", Number(v)||0)} step="100" testid="calc-lifetime"/>
          </div>

          <SectionTitle icon={Wrench} label="Labour"/>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Setup (min)"       value={f.setup_min}   onChange={(v)=>set("setup_min", Number(v)||0)}   testid="calc-setup"/>
            <Field label="Post-process (min)" value={f.post_min}   onChange={(v)=>set("post_min", Number(v)||0)}    testid="calc-post"/>
            <Field label="Labour ($/h)"       value={f.labor_rate} onChange={(v)=>set("labor_rate", Number(v)||0)} step="1" testid="calc-labor"/>
          </div>

          <SectionTitle icon={Wrench} label="Design & packaging"/>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Design fee ($)" value={f.design_fee}      onChange={(v)=>set("design_fee", Number(v)||0)}      step="1"    testid="calc-design"/>
            <Field label="Run size (× units)" value={f.run_size}    onChange={(v)=>set("run_size", Number(v)||1)}        step="1"    testid="calc-run"/>
            <Field label="Packaging ($)"  value={f.packaging_cost}  onChange={(v)=>set("packaging_cost", Number(v)||0)}  step="0.1"  testid="calc-pkg"/>
          </div>

          <SectionTitle icon={TrendingUp} label="Buffers & margin"/>
          <SliderRow label="Failure buffer" value={f.failure_pct}  min={0} max={30}  onChange={(v)=>set("failure_pct", v)}  testid="calc-fail"/>
          <SliderRow label="Overhead"       value={f.overhead_pct} min={0} max={40}  onChange={(v)=>set("overhead_pct", v)} testid="calc-oh"/>
          <SliderRow label="Retail margin"  value={f.margin_pct}   min={0} max={200} onChange={(v)=>set("margin_pct", v)}   testid="calc-margin"/>

          <SectionTitle icon={TrendingUp} label="Payment processing"/>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Processor fee (%)"    value={f.payment_fee_pct}    onChange={(v)=>set("payment_fee_pct", Number(v)||0)}    step="0.1"  testid="calc-fee-pct"/>
            <Field label="Fixed fee per txn ($)" value={f.payment_fee_fixed} onChange={(v)=>set("payment_fee_fixed", Number(v)||0)} step="0.05" testid="calc-fee-fixed"/>
          </div>
        </>
      )}

      {/* Results */}
      <div className="rounded-xl bg-forge-bg border border-forge-border p-5 space-y-3" data-testid="calc-result">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">Suggested retail</div>
            <div className="font-display text-4xl text-forge-primary font-semibold" data-testid="calc-suggested">${calc.suggested.toFixed(2)}</div>
            <div className="font-mono text-xs text-forge-muted mt-1">
              Cost basis ${calc.cost_basis.toFixed(2)} · Margin ${calc.margin_dollars.toFixed(2)} ({calc.margin_pct_real.toFixed(0)}%)
            </div>
          </div>
          {onApply && (
            <Button type="button" onClick={applyToForm} className="btn-forge rounded-full px-5" data-testid="calc-apply">
              Use as price →
            </Button>
          )}
        </div>
        {method === "standard" && (
          <div className="grid grid-cols-2 gap-1.5 pt-3 border-t border-forge-border font-mono text-xs">
            <Row label="Material"       value={`$${calc.material_cost.toFixed(2)}`}/>
            <Row label="Electricity"    value={`$${calc.electricity_cost.toFixed(2)}`}/>
            <Row label="Machine wear"   value={`$${calc.depreciation.toFixed(2)}`}/>
            <Row label="Labour"         value={`$${calc.labor_cost.toFixed(2)}`}/>
            <Row label="Design (amort.)"value={`$${calc.design_amortized.toFixed(2)}`}/>
            <Row label="Packaging"      value={`$${calc.packaging.toFixed(2)}`}/>
            <Row label="Failure buffer" value={`$${calc.failure_buffer.toFixed(2)}`}/>
            <Row label="Overhead"       value={`$${calc.overhead.toFixed(2)}`}/>
            <Row label="Markup"         value={`$${calc.markup.toFixed(2)}`}/>
            <Row label="Processor fee"  value={`$${calc.processing_fee.toFixed(2)}`}/>
          </div>
        )}
        {method === "three_x" && (
          <div className="flex items-start gap-2 text-xs font-mono text-forge-muted p-3 rounded-lg bg-forge-elevated border border-forge-border">
            <Info className="w-3 h-3 mt-0.5 text-forge-tech shrink-0"/>
            <span>3× formula = (material × 3) + ($2/h × print time) + labour = ${calc.three_x.toFixed(2)}. Fast for one-offs; use Full breakdown for accurate margins.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, step, testid }) {
  return (
    <div>
      <Label className="text-forge-text mb-2 block">{label}</Label>
      <Input
        type="number" min={0} step={step || "1"} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-forge-elevated border-forge-border text-forge-text"
        data-testid={testid}
      />
    </div>
  );
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="w-3.5 h-3.5 text-forge-tech"/>
      <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">{label}</div>
      <div className="flex-1 h-px bg-forge-border"/>
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange, testid }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-forge-text text-sm">{label}</Label>
        <span className="font-mono text-sm text-forge-primary">{value}%</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v)=>onChange(v[0])} data-testid={testid}/>
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
