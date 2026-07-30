import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, TrendingUp, Heart, Globe, Layers, X } from "lucide-react";

const TYPE_STYLES = {
  free:    { label: "FREE",     cls: "chip-tech" },
  mixed:   { label: "MIXED",    cls: "chip chip-primary" },
  premium: { label: "PREMIUM",  cls: "chip" },
  search:  { label: "META",     cls: "chip-tech" },
};

export default function SearchPage() {
  const [q, setQ] = useState("dragon");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState({ total_sites: 0, sites_searched: 0 });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sources, setSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState(new Set());
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/search/sources");
        setSources(data.sources);
      } catch {}
    })();
  }, []);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const params = { q, limit: 36 };
      if (selectedSources.size > 0) params.sources = [...selectedSources].join(",");
      const { data } = await api.get("/search/external", { params });
      setResults(data.results);
      setMeta({ total_sites: data.total_sites, sites_searched: data.sites_searched });
      setSearched(true);
    } finally { setLoading(false); }
  };

  const toggleSource = (name) => {
    setSelectedSources(prev => {
      const s = new Set(prev);
      if (s.has(name)) s.delete(name); else s.add(name);
      return s;
    });
  };

  const clearSources = () => setSelectedSources(new Set());

  const visibleResults = sourceFilter === "all"
    ? results
    : results.filter(r => r.source_type === sourceFilter);

  const typeCounts = results.reduce((acc, r) => {
    acc[r.source_type] = (acc[r.source_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="scanline w-16 mb-3"/>
      <h1 className="font-display font-semibold text-forge-text text-4xl sm:text-5xl mb-3">Aggregated 3D Search</h1>
      <p className="text-forge-muted max-w-2xl mb-8">
        One command palette to search across <span className="text-forge-tech font-mono">{sources.length || 18} sites</span> —
        Thingiverse, Printables, MyMiniFactory, Cults3D, Thangs, GrabCAD, Sketchfab, TurboSquid, and more.
        Filter by site type or narrow to a specific source.
      </p>

      <div className="relative max-w-3xl">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-forge-muted"/>
        <Input
          placeholder="Try: dragon, planter, keychain, warhammer terrain, gears…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==='Enter') run(); }}
          className="bg-forge-surface border-forge-border pl-12 pr-32 py-6 text-lg text-forge-text placeholder:text-forge-faint focus-visible:ring-forge-primary"
          data-testid="external-search-input"
        />
        <Button className="btn-forge absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-5" onClick={run} data-testid="external-search-btn">
          Search
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {["dragon","planter","keychain","phone stand","miniature","gears","warhammer","cosplay","gears","organizer"].map(s=>(
          <button key={s} onClick={()=>{ setQ(s); }} className="chip hover:text-forge-primary" data-testid={`suggest-${s}`}>#{s}</button>
        ))}
      </div>

      {/* Site chooser */}
      <div className="mt-10 card-forge p-5" data-testid="sources-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-forge-tech"/>
            <h3 className="font-display text-forge-text">Sources</h3>
            <span className="font-mono text-xs text-forge-muted">
              {selectedSources.size === 0 ? `All ${sources.length} sites` : `${selectedSources.size} selected`}
            </span>
          </div>
          {selectedSources.size > 0 && (
            <button onClick={clearSources} className="text-xs font-mono text-forge-muted hover:text-forge-primary flex items-center gap-1" data-testid="clear-sources-btn">
              <X className="w-3 h-3"/> Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map(s => {
            const active = selectedSources.has(s.source);
            return (
              <button
                key={s.source}
                onClick={()=>toggleSource(s.source)}
                data-testid={`source-toggle-${s.source}`}
                title={s.focus}
                className={`px-3 py-1.5 rounded-full text-xs font-mono border transition ${active
                  ? "bg-forge-primary text-forge-bg border-forge-primary"
                  : "bg-forge-elevated text-forge-muted border-forge-border hover:text-forge-text hover:border-forge-faint"}`}
              >
                {s.source}
                <span className="ml-2 opacity-60 text-[9px] uppercase">{s.type}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-12">
        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_,i)=><div key={i} className="card-forge h-64 animate-pulse"/>) }
          </div>
        )}
        {!loading && searched && results.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <p className="text-forge-muted font-mono text-sm">
                Found <span className="text-forge-primary">{results.length}</span> results across
                <span className="text-forge-tech"> {meta.sites_searched}</span>/{meta.total_sites} sites
              </p>
              <div className="flex flex-wrap gap-2" data-testid="type-filters">
                <TypeFilter label={`All (${results.length})`} value="all" active={sourceFilter} onClick={setSourceFilter}/>
                {Object.entries(typeCounts).map(([t, c]) => (
                  <TypeFilter key={t} label={`${TYPE_STYLES[t]?.label || t} (${c})`} value={t} active={sourceFilter} onClick={setSourceFilter}/>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="search-results">
              {visibleResults.map((r,k)=>(
                <a key={k} href={r.url} target="_blank" rel="noreferrer" className="card-forge group overflow-hidden block" data-testid={`result-${k}`}>
                  <div className="aspect-[4/3] overflow-hidden relative bg-forge-elevated">
                    <img src={r.thumb} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="chip chip-tech">{r.source}</span>
                      {r.source_type && TYPE_STYLES[r.source_type] && (
                        <span className={`chip ${TYPE_STYLES[r.source_type].cls}`}>{TYPE_STYLES[r.source_type].label}</span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3"><ExternalLink className="w-4 h-4 text-forge-text/70 group-hover:text-forge-primary transition"/></div>
                    {r.source_focus && (
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gradient-to-t from-forge-bg/90 to-transparent font-mono text-[10px] uppercase tracking-widest text-forge-text/80">
                        {r.source_focus}
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-display text-lg text-forge-text group-hover:text-forge-primary transition line-clamp-1">{r.title}</h3>
                    <p className="text-xs text-forge-muted font-mono">by {r.author}</p>
                    <div className="flex items-center gap-4 pt-2 border-t border-forge-border/60 font-mono text-xs text-forge-muted">
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-forge-tech"/> {r.downloads.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-forge-primary"/> {r.likes}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
        {!loading && !searched && (
          <div className="text-center py-16 border border-dashed border-forge-border rounded-xl">
            <Layers className="w-10 h-10 text-forge-muted mx-auto mb-3"/>
            <p className="text-forge-muted">Type a query to search across <span className="text-forge-tech">{sources.length || 18}</span> of the top 3D model sites.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TypeFilter({ label, value, active, onClick }) {
  const isActive = active === value;
  return (
    <button
      onClick={()=>onClick(value)}
      data-testid={`type-filter-${value}`}
      className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest font-mono border transition ${isActive
        ? "bg-forge-primary text-forge-bg border-forge-primary"
        : "bg-forge-surface text-forge-muted border-forge-border hover:text-forge-text"}`}
    >
      {label}
    </button>
  );
}
