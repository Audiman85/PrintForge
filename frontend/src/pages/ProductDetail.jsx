import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Rocket, Tag, Wrench, Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ModelPreview from "@/components/ModelPreview";
import PrintConfigurator from "@/components/PrintConfigurator";
import ShippingQuotes from "@/components/ShippingQuotes";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWish, setInWish] = useState(false);
  const [previewState, setPreviewState] = useState({ colors: ["#FF6B00"], config: { quality: "regular", nozzle_mm: 0.4 } });
  const [pricingMode, setPricingMode] = useState("fixed"); // "fixed" | "quote"
  const [customQuote, setCustomQuote] = useState(null);
  const [shipping, setShipping] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setP(data);
        if (user) {
          const { data: wl } = await api.get("/wishlist");
          setInWish(!!wl.find(x => x.product_id === id));
        }
      } finally { setLoading(false); }
    })();
  }, [id, user]);

  const toggle = async () => {
    if (!user) { toast(t("wishlist.signin_required")); return; }
    const { data } = await api.post("/wishlist/toggle", { product_id: id });
    setInWish(data.in_wishlist);
    toast.success(data.in_wishlist ? t("wishlist.added") : t("wishlist.removed"));
  };

  const onQuote = useCallback(({ quote, colors, config }) => {
    setPreviewState({ colors, config });
    setCustomQuote(quote);
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-14"><div className="h-96 animate-pulse card-forge"/></div>;
  if (!p) return <div className="max-w-7xl mx-auto px-6 py-14 text-forge-muted">Not found</div>;

  const shippingCost = shipping ? shipping.price : 0;
  const printSubtotal = pricingMode === "fixed" ? p.price : (customQuote?.line_subtotal || p.price);
  const grandTotal = printSubtotal + shippingCost;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-forge-muted hover:text-forge-primary text-sm mb-6" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4"/> {t("product.back")}
      </Link>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: 3D preview + reference */}
        <div className="lg:col-span-6 space-y-4">
          <ModelPreview
            shape={p.preview_shape || "torusknot"}
            colors={previewState.colors}
            quality={previewState.config.quality}
            nozzleMm={previewState.config.nozzle_mm}
            height={440}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden border border-forge-border">
              <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover"/>
            </div>
            <div className="card-forge p-4 space-y-2">
              <div className="scanline w-8"/>
              <h1 className="font-display font-semibold text-forge-text text-2xl leading-tight">{p.title}</h1>
              <p className="text-xs text-forge-muted line-clamp-3">{p.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="chip chip-tech">{p.material}</span>
                <span className="chip">{p.print_weight_grams || 60}g</span>
                <span className="chip">{p.print_time_hours}h</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(p.tags||[]).map(tag=><span key={tag} className="chip">#{tag}</span>)}
          </div>
        </div>

        {/* Right: pricing mode + configurator + shipping */}
        <div className="lg:col-span-6 space-y-4">

          {/* Pricing mode toggle */}
          <div className="card-forge p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-forge-primary"/>
              <h3 className="font-display text-forge-text">Choose your pricing</h3>
            </div>
            <div className="grid grid-cols-2 gap-3" data-testid="pricing-mode">
              <button
                type="button"
                onClick={() => setPricingMode("fixed")}
                data-testid="mode-fixed"
                className={`p-4 rounded-lg text-left transition border ${pricingMode==="fixed" ? "border-forge-primary bg-forge-primary/10" : "border-forge-border bg-forge-elevated hover:border-forge-faint"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-forge-primary"/>
                  <span className="font-display text-forge-text">Fixed Price</span>
                </div>
                <div className="font-mono text-forge-primary text-2xl font-semibold" data-testid="fixed-price">${p.price.toFixed(2)}</div>
                <div className="font-mono text-[10px] text-forge-muted uppercase tracking-widest mt-1">Ready-to-order · standard PLA</div>
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("quote")}
                data-testid="mode-quote"
                className={`p-4 rounded-lg text-left transition border ${pricingMode==="quote" ? "border-forge-primary bg-forge-primary/10" : "border-forge-border bg-forge-elevated hover:border-forge-faint"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Wrench className="w-4 h-4 text-forge-tech"/>
                  <span className="font-display text-forge-text">Get a Quote</span>
                </div>
                <div className="font-mono text-forge-tech text-2xl font-semibold" data-testid="quote-price">
                  {customQuote ? `$${customQuote.line_subtotal.toFixed(2)}` : "—"}
                </div>
                <div className="font-mono text-[10px] text-forge-muted uppercase tracking-widest mt-1">Custom material · finish · quantity</div>
              </button>
            </div>
          </div>

          {/* Configurator only when quote mode is active */}
          {pricingMode === "quote" && (
            <PrintConfigurator product={p} onQuoteChange={onQuote}/>
          )}

          {/* Shipping quotes */}
          <ShippingQuotes
            weightGrams={
              pricingMode === "quote" && customQuote
                ? customQuote.estimated_weight_grams * (customQuote.quantity || 1)
                : (p.print_weight_grams || 60)
            }
            items={pricingMode === "quote" && customQuote ? customQuote.quantity : 1}
            onSelect={setShipping}
          />

          {/* Grand total + CTAs */}
          <div className="card-forge p-5 space-y-3" data-testid="grand-total-panel">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">
                  {pricingMode === "fixed" ? "Fixed price total" : "Custom quote total"}
                </div>
                <div className="font-display text-forge-primary text-4xl font-semibold" data-testid="grand-total">
                  ${grandTotal.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-widest text-forge-muted">Includes</div>
                <div className="font-mono text-xs text-forge-text">
                  ${printSubtotal.toFixed(2)} print
                </div>
                <div className="font-mono text-xs text-forge-muted flex items-center gap-1 justify-end">
                  <Truck className="w-3 h-3"/> +${shippingCost.toFixed(2)} {shipping?.carrier_name?.split(" ")[0] || "shipping"}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-forge-border">
              <Link to={`/print?product=${p.product_id}&mode=${pricingMode}`} className="flex-1">
                <Button className="btn-forge w-full rounded-full py-6 text-base" data-testid="request-print-btn">
                  <Rocket className="w-4 h-4 mr-2"/> {pricingMode === "fixed" ? "Order at fixed price" : t("product.request_print")}
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={toggle}
                className={`rounded-full py-6 px-6 border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text ${inWish ? "bg-forge-primary/10 border-forge-primary text-forge-primary" : ""}`}
                data-testid="detail-wishlist-btn"
              >
                <Heart className={`w-4 h-4 mr-2 ${inWish ? "fill-current" : ""}`}/> {inWish ? t("wishlist.saved") : t("wishlist.save")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Printer info at bottom */}
      <PrinterInfoStrip/>
    </div>
  );
}

function PrinterInfoStrip() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    (async () => { try { const { data } = await api.get("/printer"); setInfo(data); } catch {} })();
  }, []);
  if (!info) return null;
  return (
    <section className="mt-16 pt-8 border-t border-forge-border" data-testid="printer-info-strip">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <img src={info.image_url} alt={info.name} className="w-full md:w-72 h-48 object-cover rounded-xl border border-forge-border"/>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="scanline w-8"/>
            <span className="font-mono text-xs uppercase tracking-widest text-forge-tech">Printed on</span>
          </div>
          <h2 className="font-display text-forge-text text-3xl mb-1">{info.name}</h2>
          <p className="text-forge-muted text-sm mb-4">{info.model} · <span className="text-forge-primary font-mono">{info.colors}-colour</span> multi-material system</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 mb-4">
            <SpecRow label="Build volume" value={`${info.build_volume_mm.x} × ${info.build_volume_mm.y} × ${info.build_volume_mm.z} mm`}/>
            <SpecRow label="Max speed"    value={`${info.max_speed_mm_s} mm/s`}/>
            <SpecRow label="Hotend"       value={`up to ${info.max_temp_hotend_c}°C`}/>
            <SpecRow label="Heated bed"   value={`up to ${info.max_temp_bed_c}°C`}/>
            <SpecRow label="Colours"      value={`${info.colors} filaments (AMS)`}/>
            <SpecRow label="Materials"    value={info.supported_materials.slice(0,4).join(" · ") + (info.supported_materials.length > 4 ? "…" : "")}/>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {info.features.slice(0, 6).map(f => <span key={f} className="chip">{f}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function SpecRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between border-b border-forge-border/40 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-forge-muted">{label}</span>
      <span className="font-display text-forge-text text-sm">{value}</span>
    </div>
  );
}
