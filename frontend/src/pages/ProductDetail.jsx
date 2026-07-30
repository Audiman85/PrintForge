import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Rocket } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ModelPreview from "@/components/ModelPreview";
import PrintConfigurator from "@/components/PrintConfigurator";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWish, setInWish] = useState(false);
  const [previewState, setPreviewState] = useState({ colors: ["#FF6B00"], config: { quality: "regular", nozzle_mm: 0.4 } });

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
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-14"><div className="h-96 animate-pulse card-forge"/></div>;
  if (!p) return <div className="max-w-7xl mx-auto px-6 py-14 text-forge-muted">Not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-forge-muted hover:text-forge-primary text-sm mb-6" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4"/> {t("product.back")}
      </Link>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: live 3D preview + reference image */}
        <div className="lg:col-span-7 space-y-4">
          <ModelPreview
            shape={p.preview_shape || "torusknot"}
            colors={previewState.colors}
            quality={previewState.config.quality}
            nozzleMm={previewState.config.nozzle_mm}
            height={460}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden border border-forge-border">
              <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover"/>
            </div>
            <div className="card-forge p-4 space-y-2">
              <div className="scanline w-8"/>
              <h1 className="font-display font-semibold text-forge-text text-2xl leading-tight">{p.title}</h1>
              <p className="text-sm text-forge-muted line-clamp-3">{p.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="chip chip-tech">{p.material}</span>
                <span className="chip">{p.category}</span>
                <span className="chip">{p.print_weight_grams || 60}g</span>
                <span className="chip">{p.print_time_hours}h</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(p.tags||[]).map(t=><span key={t} className="chip">#{t}</span>)}
          </div>
        </div>

        {/* Right: configurator + actions */}
        <div className="lg:col-span-5 space-y-4">
          <PrintConfigurator product={p} onQuoteChange={onQuote}/>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={`/print?product=${p.product_id}`} className="flex-1">
              <Button className="btn-forge w-full rounded-full py-6 text-base" data-testid="request-print-btn">
                <Rocket className="w-4 h-4 mr-2"/> {t("product.request_print")}
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
  );
}
