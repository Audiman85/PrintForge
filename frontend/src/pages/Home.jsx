import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { Search, Rocket, Boxes, Cpu, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/categories"); setCategories(data); } catch {}
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== "all") params.category = category;
      if (q) params.q = q;
      const { data } = await api.get("/products", { params });
      setProducts(data);
    } finally { setLoading(false); }
  };

  const loadWishlist = async () => {
    if (!user) { setWishlistIds(new Set()); return; }
    try {
      const { data } = await api.get("/wishlist");
      setWishlistIds(new Set(data.map(p => p.product_id)));
    } catch {}
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category]);
  useEffect(() => { loadWishlist(); /* eslint-disable-next-line */ }, [user]);

  const onWish = (id, on) => {
    setWishlistIds(prev => {
      const s = new Set(prev);
      if (on) s.add(id); else s.delete(id);
      return s;
    });
  };

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 grain pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-3">
              <div className="scanline w-16" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-forge-tech">{t("hero.eyebrow")}</span>
            </div>
            <h1 className="font-display font-semibold text-forge-text text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
              {t("hero.title1")}<br/>
              <span className="text-forge-primary">{t("hero.title2")}</span><br/>
              {t("hero.title3")}
            </h1>
            <p className="text-forge-muted text-lg max-w-xl leading-relaxed">
              {t("hero.desc")}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/search">
                <Button className="btn-forge rounded-full px-6 py-6 text-base" data-testid="hero-cta-search">
                  <Search className="w-4 h-4 mr-2"/> {t("hero.cta_search")}
                </Button>
              </Link>
              <Link to="/print">
                <Button variant="outline" className="rounded-full px-6 py-6 text-base border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text" data-testid="hero-cta-print">
                  {t("hero.cta_send")} <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-4">
              {[{i:Boxes,l:"12,400+ models"},{i:Cpu,l:"Multi-site search"},{i:Sparkles,l:"Community uploads"}].map(({i:Icon,l},k)=>(
                <div key={k} className="flex items-center gap-2 text-sm text-forge-muted">
                  <Icon className="w-4 h-4 text-forge-tech"/> {l}
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-forge-border">
              <img src="https://images.pexels.com/photos/31137405/pexels-photo-31137405.jpeg?auto=compress&cs=tinysrgb&h=800" alt="3D printer" className="w-full h-[520px] object-cover"/>
              <div className="absolute inset-0 bg-gradient-to-t from-forge-bg via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <div className="glass rounded-lg px-4 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">Current Job</div>
                  <div className="font-display text-forge-text text-lg">Voronoi Lamp Shade</div>
                </div>
                <div className="glass rounded-lg px-4 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">Progress</div>
                  <div className="font-mono text-forge-primary text-xl font-semibold">64%</div>
                </div>
              </div>
              <div className="absolute top-6 right-6 chip chip-primary animate-forge-pulse"><Rocket className="w-3 h-3"/> LIVE</div>
            </div>
          </div>
        </div>
      </section>

      {/* MARKETPLACE */}
      <section className="max-w-7xl mx-auto px-6 py-14" id="marketplace">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="scanline w-12 mb-3" />
            <h2 className="font-display font-semibold text-forge-text text-3xl sm:text-4xl">{t("market.title")}</h2>
            <p className="text-forge-muted mt-2 max-w-xl">{t("market.desc")}</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted"/>
              <Input
                placeholder={t("market.search_ph")}
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                onKeyDown={(e)=>{ if(e.key==='Enter') load(); }}
                className="bg-forge-surface border-forge-border pl-9 text-forge-text placeholder:text-forge-faint focus-visible:ring-forge-primary"
                data-testid="catalog-search-input"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-8" data-testid="category-filters">
          <button
            onClick={()=>setCategory("all")}
            data-testid="filter-all"
            className={`px-4 py-2 rounded-full text-xs uppercase tracking-widest font-mono border transition ${category==="all" ? "bg-forge-primary text-forge-bg border-forge-primary" : "bg-forge-surface text-forge-muted border-forge-border hover:text-forge-text"}`}>
            All
          </button>
          {categories.map(c=>(
            <button
              key={c.code}
              onClick={()=>setCategory(c.code)}
              data-testid={`filter-${c.code}`}
              title={c.desc}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-widest font-mono border transition flex items-center gap-1.5 ${category===c.code ? "bg-forge-primary text-forge-bg border-forge-primary" : "bg-forge-surface text-forge-muted border-forge-border hover:text-forge-text"}`}>
              {c.label}
              {c.coming_soon && <span className="px-1.5 py-0.5 rounded bg-forge-tech/20 text-forge-tech text-[8px] tracking-widest">SOON</span>}
            </button>
          ))}
        </div>

        {/* Coming-soon banner replaces the grid when a coming-soon category is picked */}
        {categories.find(c => c.code === category)?.coming_soon ? (
          <ComingSoonCategory
            category={categories.find(c => c.code === category)}
          />
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_,i)=><div key={i} className="card-forge h-80 animate-pulse"/>) }
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-forge-border rounded-xl">
            <p className="text-forge-muted">No products match your filters.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="product-grid">
            {products.map(p=>(
              <ProductCard
                key={p.product_id}
                product={p}
                inWishlist={wishlistIds.has(p.product_id)}
                onWishlistChange={onWish}
              />
            ))}
          </div>
        )}
      </section>

      {/* MOBILE APP DOWNLOAD */}
      <section className="max-w-7xl mx-auto px-6 py-14" data-testid="app-download-section">
        <div className="relative overflow-hidden rounded-2xl border border-forge-border bg-gradient-to-br from-forge-surface via-forge-surface to-forge-primary/10 p-8 md:p-12">
          <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full bg-forge-primary/15 blur-3xl pointer-events-none"/>
          <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-forge-tech/10 blur-3xl pointer-events-none"/>

          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="scanline w-16"/>
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-forge-tech">PrintForge on the go</span>
              </div>
              <h2 className="font-display font-semibold text-forge-text text-4xl sm:text-5xl leading-tight mb-4">
                Take your <span className="text-forge-primary">workshop</span><br/>everywhere.
              </h2>
              <p className="text-forge-muted text-base leading-relaxed mb-8 max-w-lg">
                Track live prints, chat with the maker, save designs on the move, and get restock alerts the second new filament lands. Free on iOS &amp; Android.
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <a
                  href="https://apps.apple.com/app/printforge"
                  target="_blank" rel="noreferrer"
                  data-testid="app-store-btn"
                  className="inline-flex items-center gap-3 bg-forge-bg border border-forge-border hover:border-forge-primary text-forge-text px-5 py-3 rounded-xl transition"
                >
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
                    <path d="M17.564 12.87c-.021-2.32 1.902-3.437 1.988-3.492-1.083-1.58-2.769-1.796-3.373-1.821-1.437-.144-2.804.845-3.535.845-.732 0-1.858-.822-3.05-.8-1.567.023-3.014.911-3.822 2.313-1.63 2.826-.418 7 1.171 9.29.777 1.121 1.702 2.38 2.918 2.336 1.171-.047 1.614-.759 3.03-.759 1.417 0 1.815.759 3.05.734 1.26-.022 2.058-1.144 2.827-2.27.89-1.298 1.257-2.555 1.278-2.62-.028-.011-2.457-.943-2.482-3.756zm-2.34-6.9c.65-.786 1.087-1.878.968-2.97-.938.038-2.073.624-2.744 1.41-.601.696-1.128 1.808-.986 2.878 1.046.082 2.113-.53 2.762-1.318z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-forge-muted leading-none">Download on the</div>
                    <div className="font-display text-lg leading-tight">App Store</div>
                  </div>
                </a>

                <a
                  href="https://play.google.com/store/apps/details?id=com.printforge"
                  target="_blank" rel="noreferrer"
                  data-testid="google-play-btn"
                  className="inline-flex items-center gap-3 bg-forge-bg border border-forge-border hover:border-forge-primary text-forge-text px-5 py-3 rounded-xl transition"
                >
                  <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
                    <path fill="#00F0FF" d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l11-11-11-8.4z"/>
                    <path fill="#FF6B00" d="M17.1 12l-2.5 2.5L4 21.7c.4.1.9 0 1.4-.3l11.7-6.7L17.1 12z"/>
                    <path fill="#EDEDED" d="M20.4 10.2l-3.3-1.9-2.9 2.9L17 14l3.3-1.9c1-.6 1-1.5.1-2z"/>
                    <path fill="#8B5CF6" d="M14.6 11.2l2.5-2.5L5.4 2.1c-.5-.3-1-.4-1.4-.3l10.6 9.4z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-forge-muted leading-none">Get it on</div>
                    <div className="font-display text-lg leading-tight">Google Play</div>
                  </div>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-forge-muted">
                <span className="flex items-center gap-1.5">
                  <span className="text-forge-primary">★★★★★</span> 4.8 · 2.4k reviews
                </span>
                <span>iOS 15+ · Android 10+</span>
                <span className="text-forge-tech uppercase tracking-widest">Free · No ads</span>
              </div>
            </div>

            <div className="relative flex justify-center md:justify-end">
              <div className="relative w-56 aspect-[9/19] rounded-[2.5rem] bg-forge-bg border-[6px] border-forge-elevated shadow-2xl overflow-hidden rotate-3">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-forge-elevated rounded-b-2xl z-10"/>
                <img
                  src="https://images.unsplash.com/photo-1748852458189-38b171a9e7ec?w=500"
                  alt="PrintForge mobile"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forge-bg/90 via-transparent to-forge-bg/50"/>
                <div className="absolute bottom-6 left-4 right-4">
                  <div className="chip chip-tech mb-2">LIVE</div>
                  <div className="font-display text-forge-text text-sm">Voronoi Lamp Shade</div>
                  <div className="font-mono text-[10px] text-forge-muted uppercase tracking-widest">Printing · 64%</div>
                  <div className="mt-2 h-1.5 rounded-full bg-forge-elevated overflow-hidden">
                    <div className="h-full bg-forge-primary" style={{width: "64%"}}/>
                  </div>
                </div>
              </div>
              <div className="hidden md:block absolute -left-8 top-8 w-44 aspect-[9/19] rounded-[2rem] bg-forge-bg border-[5px] border-forge-elevated shadow-xl overflow-hidden -rotate-6 opacity-70">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-4 bg-forge-elevated rounded-b-2xl z-10"/>
                <div className="w-full h-full bg-gradient-to-br from-forge-primary/40 via-forge-tech/20 to-transparent"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {icon:Search, title:"Search Everywhere", desc:"Cross-search Thingiverse, Printables, Cults3D & more in one command palette.", to:"/search", cta:"Open search"},
            {icon:Rocket, title:"Send Us A File", desc:"Upload STL/OBJ/3MF — we'll print in your material and colour, then ship.", to:"/print", cta:"Send to print"},
            {icon:Sparkles, title:"Share Your Design", desc:"Upload your own creations, get community likes, download counts and feedback.", to:"/community", cta:"Community"},
          ].map(({icon:Icon,title,desc,to,cta},k)=>(
            <Link key={k} to={to} className="card-forge p-6 relative noise-panel group">
              <Icon className="w-8 h-8 text-forge-primary mb-4"/>
              <h3 className="font-display text-xl text-forge-text mb-2">{title}</h3>
              <p className="text-sm text-forge-muted mb-4">{desc}</p>
              <span className="font-mono text-xs uppercase tracking-widest text-forge-tech link-underline">{cta} →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ComingSoonCategory({ category }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  return (
    <div className="rounded-2xl border border-forge-border bg-forge-surface p-10 md:p-14 relative overflow-hidden noise-panel" data-testid="coming-soon-panel">
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-forge-primary/15 blur-3xl"/>
      <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-forge-tech/10 blur-3xl"/>
      <div className="relative max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="chip chip-tech">COMING SOON</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-forge-muted">In the workshop</span>
        </div>
        <h3 className="font-display text-forge-text text-4xl mb-3">{category.label}</h3>
        <p className="text-forge-muted mb-8 leading-relaxed">
          {category.desc || "This catalog is being built."} We're prototyping the first designs on the AnyCubic Kobra S1 right now — sign up and we'll notify you the day it ships.
        </p>
        {subscribed ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-forge-primary/15 border border-forge-primary text-forge-primary font-mono text-sm" data-testid="coming-soon-subscribed">
            You're on the list — we'll be in touch.
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); if (email) setSubscribed(true); }}
            className="flex flex-col sm:flex-row gap-2 max-w-md"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-forge-elevated border border-forge-border rounded-full px-4 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
              data-testid="coming-soon-email"
            />
            <button type="submit" className="btn-forge rounded-full px-5 py-2.5 text-sm" data-testid="coming-soon-notify">
              Notify me
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
