import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Heart, Clock, Package, ArrowLeft, Rocket } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWish, setInWish] = useState(false);

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
    if (!user) { toast("Sign in to save to wishlist"); return; }
    const { data } = await api.post("/wishlist/toggle", { product_id: id });
    setInWish(data.in_wishlist);
    toast.success(data.in_wishlist ? "Added to wishlist" : "Removed from wishlist");
  };

  if (loading) return <div className="max-w-7xl mx-auto px-6 py-14"><div className="h-96 animate-pulse card-forge"/></div>;
  if (!p) return <div className="max-w-7xl mx-auto px-6 py-14 text-forge-muted">Product not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-forge-muted hover:text-forge-primary text-sm mb-6" data-testid="back-btn"><ArrowLeft className="w-4 h-4"/> Back to marketplace</Link>
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="rounded-xl overflow-hidden border border-forge-border relative bg-forge-elevated">
          <img src={p.image_url} alt={p.title} className="w-full aspect-square object-cover"/>
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="chip chip-tech">{p.material}</span>
            <span className="chip">{p.category}</span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 glass rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">3D VIEWER · MOCK</span>
            <span className="font-mono text-xs text-forge-muted">Drag to rotate ↻</span>
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <div className="scanline w-12 mb-3"/>
            <h1 className="font-display font-semibold text-forge-text text-4xl leading-tight">{p.title}</h1>
            <p className="text-forge-muted mt-3 leading-relaxed">{p.description}</p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-forge-primary text-4xl font-semibold">${p.price.toFixed(2)}</span>
            <span className="font-mono text-xs text-forge-muted">per unit / ships in 5–7 days</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="card-forge p-4">
              <Clock className="w-4 h-4 text-forge-tech mb-2"/>
              <div className="font-mono text-[10px] text-forge-muted uppercase tracking-widest">Print Time</div>
              <div className="font-display text-forge-text text-lg">{p.print_time_hours}h</div>
            </div>
            <div className="card-forge p-4">
              <Package className="w-4 h-4 text-forge-tech mb-2"/>
              <div className="font-mono text-[10px] text-forge-muted uppercase tracking-widest">Material</div>
              <div className="font-display text-forge-text text-lg">{p.material}</div>
            </div>
            <div className="card-forge p-4">
              <Rocket className="w-4 h-4 text-forge-tech mb-2"/>
              <div className="font-mono text-[10px] text-forge-muted uppercase tracking-widest">Category</div>
              <div className="font-display text-forge-text text-lg capitalize">{p.category}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(p.tags||[]).map(t=><span key={t} className="chip">#{t}</span>)}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <Link to={`/print?product=${p.product_id}`} className="flex-1">
              <Button className="btn-forge w-full rounded-full py-6 text-base" data-testid="request-print-btn"><Rocket className="w-4 h-4 mr-2"/> Request a print</Button>
            </Link>
            <Button
              variant="outline"
              onClick={toggle}
              className={`rounded-full py-6 px-6 border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text ${inWish ? "bg-forge-primary/10 border-forge-primary text-forge-primary" : ""}`}
              data-testid="detail-wishlist-btn"
            >
              <Heart className={`w-4 h-4 mr-2 ${inWish ? "fill-current" : ""}`}/> {inWish ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
