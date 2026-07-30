import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import api from "@/lib/api";

export default function TopCommunityDesigns() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/community/top", { params: { limit: 10 } });
        setItems(data.designs || []);
      } catch {
        setItems([]);
      } finally { setLoading(false); }
    })();
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14" data-testid="top-community">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="scanline w-12"/>
            <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-forge-tech">Top Community</span>
          </div>
          <h2 className="font-display font-semibold text-forge-text text-2xl sm:text-3xl lg:text-4xl">
            Most-starred <span className="text-forge-primary">community designs</span>.
          </h2>
        </div>
        <Link
          to="/community"
          data-testid="top-community-all"
          className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-forge-tech hover:text-forge-primary transition"
        >
          Browse all <ArrowRight className="w-3 h-3"/>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {(loading ? Array.from({length: 10}) : items).map((d, i) => d ? (
          <Link
            key={d.design_id}
            to={`/community#${d.design_id}`}
            data-testid={`top-community-card-${d.design_id}`}
            className="card-forge overflow-hidden group"
          >
            <div className="aspect-square bg-forge-elevated relative overflow-hidden">
              <img
                src={d.preview_path ? `${process.env.REACT_APP_BACKEND_URL}/api/files/download?path=${encodeURIComponent(d.preview_path)}` : "https://images.unsplash.com/photo-1518732714860-b62714ce0c59?w=600"}
                alt={d.title}
                className="w-full h-full object-cover group-hover:scale-105 transition"
                loading="lazy"
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallback) {
                    e.currentTarget.dataset.fallback = "1";
                    e.currentTarget.src = "https://images.unsplash.com/photo-1518732714860-b62714ce0c59?w=600";
                  }
                }}
              />
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 chip chip-primary text-[9px]">
                <Star className="w-2.5 h-2.5 fill-current"/> {d.stars || 0}
              </span>
            </div>
            <div className="p-3">
              <div className="font-display text-forge-text text-sm truncate">{d.title}</div>
              <div className="text-[10px] font-mono text-forge-muted truncate">by {d.author_name}</div>
            </div>
          </Link>
        ) : (
          <div key={i} className="card-forge overflow-hidden">
            <div className="aspect-square bg-forge-elevated animate-pulse"/>
            <div className="p-3 space-y-1">
              <div className="h-3 bg-forge-elevated rounded animate-pulse"/>
              <div className="h-2 bg-forge-elevated rounded w-1/2 animate-pulse"/>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
