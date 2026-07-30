import { Link, useNavigate } from "react-router-dom";
import { Heart, Clock, Layers } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import ShareButtons from "@/components/ShareButtons";

export default function ProductCard({ product, inWishlist, onWishlistChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast("Sign in to save to wishlist"); return; }
    try {
      const { data } = await api.post("/wishlist/toggle", { product_id: product.product_id });
      onWishlistChange?.(product.product_id, data.in_wishlist);
      toast.success(data.in_wishlist ? "Added to wishlist" : "Removed from wishlist");
    } catch { toast.error("Failed to update wishlist"); }
  };

  return (
    <Link to={`/product/${product.product_id}`} className="card-forge group block overflow-hidden" data-testid={`product-card-${product.product_id}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-forge-elevated">
        <img
          src={product.image_url}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <button
          onClick={toggleWishlist}
          data-testid={`wishlist-btn-${product.product_id}`}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition ${inWishlist ? "bg-forge-primary text-forge-bg" : "bg-forge-bg/60 text-forge-text hover:bg-forge-primary hover:text-forge-bg"}`}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`}/>
        </button>
        <div className="absolute top-3 right-14" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <ShareButtons
            url={`${window.location.origin}/product/${product.product_id}`}
            title={`${product.title} · $${product.price} on PrintForge`}
            compact
          />
        </div>
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          <span className="chip chip-tech">{product.material}</span>
          <span className="chip">{product.category}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-forge-text text-lg leading-tight line-clamp-1 group-hover:text-forge-primary transition">{product.title}</h3>
          <span className="font-mono text-forge-primary font-semibold text-lg whitespace-nowrap">${product.price.toFixed(0)}</span>
        </div>
        <p className="text-sm text-forge-muted line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between pt-2 border-t border-forge-border/60">
          <div className="flex items-center gap-3 text-xs font-mono text-forge-muted">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {product.print_time_hours}h</span>
            <span className="flex items-center gap-1"><Layers className="w-3 h-3"/> {product.tags?.length || 0} tags</span>
          </div>
          <span className="text-xs font-mono text-forge-tech uppercase tracking-wider">View →</span>
        </div>
      </div>
    </Link>
  );
}
