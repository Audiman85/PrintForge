import { useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, TrendingUp, Heart } from "lucide-react";

export default function SearchPage() {
  const [q, setQ] = useState("dragon");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get("/search/external", { params: { q } });
      setResults(data.results);
      setSearched(true);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="scanline w-16 mb-3"/>
      <h1 className="font-display font-semibold text-forge-text text-4xl sm:text-5xl mb-3">Aggregated 3D Search</h1>
      <p className="text-forge-muted max-w-2xl mb-8">One command palette to search across Thingiverse, Printables, MyMiniFactory, Cults3D and Thangs. Find anything printable, from anywhere.</p>

      <div className="relative max-w-3xl">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-forge-muted"/>
        <Input
          placeholder="Try: dragon, planter, keychain, warhammer terrain…"
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
        {["dragon","planter","keychain","phone stand","miniature","gears"].map(s=>(
          <button key={s} onClick={()=>{ setQ(s); }} className="chip hover:text-forge-primary" data-testid={`suggest-${s}`}>#{s}</button>
        ))}
      </div>

      <div className="mt-12">
        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_,i)=><div key={i} className="card-forge h-64 animate-pulse"/>) }
          </div>
        )}
        {!loading && searched && results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-forge-muted font-mono text-sm">Found <span className="text-forge-primary">{results.length}</span> results across <span className="text-forge-tech">5 sites</span></p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="search-results">
              {results.map((r,k)=>(
                <a key={k} href={r.url} target="_blank" rel="noreferrer" className="card-forge group overflow-hidden block" data-testid={`result-${k}`}>
                  <div className="aspect-[4/3] overflow-hidden relative bg-forge-elevated">
                    <img src={r.thumb} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
                    <div className="absolute top-3 left-3"><span className="chip chip-tech">{r.source}</span></div>
                    <div className="absolute top-3 right-3"><ExternalLink className="w-4 h-4 text-forge-text/70 group-hover:text-forge-primary transition"/></div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-display text-lg text-forge-text group-hover:text-forge-primary transition line-clamp-1">{r.title}</h3>
                    <p className="text-xs text-forge-muted font-mono">by {r.author}</p>
                    <div className="flex items-center gap-4 pt-2 border-t border-forge-border/60 font-mono text-xs text-forge-muted">
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-forge-tech"/> {r.downloads.toLocaleString()} downloads</span>
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
            <Search className="w-10 h-10 text-forge-muted mx-auto mb-3"/>
            <p className="text-forge-muted">Type a query to search across the top 3D model sites.</p>
          </div>
        )}
      </div>
    </div>
  );
}
