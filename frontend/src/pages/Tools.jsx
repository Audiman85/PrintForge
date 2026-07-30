import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { loginWithReturn } from "@/lib/authRedirect";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search, Wand2, LogIn, Lock, Type, Image as ImageIcon, Puzzle, Sparkles, Frame, Coins, Stamp, Cookie, ScanLine, Layers, KeyRound, Vote, Camera, Palette, Ruler } from "lucide-react";

// Curated set of MakerWorld MakerLab tools — always up to date via the direct link.
// Adding a tool? Just append to this list. No backend calls required.
const MAKERLAB_BASE = "https://makerworld.com/en/makerlab";

const TOOLS = [
  {
    id: "make-my-sign",
    name: "Make My Sign",
    desc: "Personalised nameplates, signs, and badges with fonts, curves, and multi-material colour packs.",
    category: "text",
    icon: Type,
    tint: "#F97316",
    href: `${MAKERLAB_BASE}/make-my-sign`,
    tags: ["signs", "nameplate", "badge"],
  },
  {
    id: "make-my-vase",
    name: "Make My Vase",
    desc: "Design custom vases with parametric height, taper, and texture presets.",
    category: "decor",
    icon: Sparkles,
    tint: "#8B5CF6",
    href: `${MAKERLAB_BASE}/make-my-vase`,
    tags: ["vase", "decor", "parametric"],
  },
  {
    id: "pixel-puzzle",
    name: "Pixel Puzzle Maker",
    desc: "Turn any photo into an interlocking 3D pixel puzzle — pick grid size & bevel depth.",
    category: "image",
    icon: Puzzle,
    tint: "#22C55E",
    href: `${MAKERLAB_BASE}/pixel-puzzle-maker`,
    tags: ["puzzle", "photo", "gift"],
  },
  {
    id: "image-to-3d",
    name: "Image → 3D Model",
    desc: "Convert a single image into a printable 3D relief with adjustable depth & smoothing.",
    category: "image",
    icon: ImageIcon,
    tint: "#38BDF8",
    href: `${MAKERLAB_BASE}/image-to-3d`,
    tags: ["image", "relief", "convert"],
  },
  {
    id: "image-to-keychain",
    name: "Image → Keychain",
    desc: "Drop a photo, get a tiny keychain-sized relief with a hole for a split ring.",
    category: "image",
    icon: KeyRound,
    tint: "#F59E0B",
    href: `${MAKERLAB_BASE}/image-to-keychain`,
    tags: ["keychain", "photo", "gift"],
  },
  {
    id: "make-my-statue",
    name: "Make My Statue",
    desc: "Face-photo to 3D bust generator — trim base, tweak neck, print at any scale.",
    category: "sculpture",
    icon: Wand2,
    tint: "#EC4899",
    href: `${MAKERLAB_BASE}/make-my-statue`,
    tags: ["portrait", "bust", "statue"],
  },
  {
    id: "relief-sculpture",
    name: "3D → Relief Sculpture",
    desc: "Turn any 3D model into a wall-mountable low-relief carving. MakerLab experiment.",
    category: "experiment",
    icon: Layers,
    tint: "#A855F7",
    href: `${MAKERLAB_BASE}/3d-to-relief-sculpture`,
    tags: ["relief", "wall art"],
  },
  {
    id: "ai-scanner",
    name: "AI Scanner",
    desc: "Scan a real-world object with your phone; MakerLab reconstructs a printable mesh.",
    category: "experiment",
    icon: ScanLine,
    tint: "#0EA5E9",
    href: `${MAKERLAB_BASE}/ai-scanner`,
    tags: ["scan", "photogrammetry"],
  },
  {
    id: "lithophane",
    name: "Lithophane Maker",
    desc: "Photo → backlit lithophane. Adjust depth curve, corner radius, and framing.",
    category: "image",
    icon: Camera,
    tint: "#F43F5E",
    href: `${MAKERLAB_BASE}/lithophane`,
    tags: ["lithophane", "light", "photo"],
  },
  {
    id: "photobox",
    name: "Photo Box",
    desc: "Assemble a multi-side lithophane box (candle safe) with slot for LED puck.",
    category: "image",
    icon: Frame,
    tint: "#FB923C",
    href: `${MAKERLAB_BASE}/photobox`,
    tags: ["box", "lithophane", "light"],
  },
  {
    id: "stamp-maker",
    name: "Stamp Maker",
    desc: "Text or logo → printable rubber-stamp die with adjustable relief height.",
    category: "text",
    icon: Stamp,
    tint: "#B45309",
    href: `${MAKERLAB_BASE}/stamp-maker`,
    tags: ["stamp", "logo"],
  },
  {
    id: "coin-maker",
    name: "Coin Maker",
    desc: "Two-sided coin generator with text edges and pick-your-metal filament palette.",
    category: "decor",
    icon: Coins,
    tint: "#EAB308",
    href: `${MAKERLAB_BASE}/coin-maker`,
    tags: ["coin", "medal"],
  },
  {
    id: "cookie-cutter",
    name: "Cookie Cutter",
    desc: "Draw a shape or upload an outline → food-safe cookie cutter with grip lip.",
    category: "functional",
    icon: Cookie,
    tint: "#F97316",
    href: `${MAKERLAB_BASE}/cookie-cutter`,
    tags: ["cookie", "kitchen"],
  },
  {
    id: "custom-badge",
    name: "Custom Badge",
    desc: "Round or shield badges with icons, name, and lanyard slot — great for events.",
    category: "text",
    icon: Vote,
    tint: "#4F46E5",
    href: `${MAKERLAB_BASE}/custom-badge`,
    tags: ["badge", "event"],
  },
  {
    id: "colour-swatch",
    name: "Colour Swatch",
    desc: "Print a physical colour picker for filament comparison and shade matching.",
    category: "functional",
    icon: Palette,
    tint: "#14B8A6",
    href: `${MAKERLAB_BASE}/colour-swatch`,
    tags: ["swatch", "reference"],
  },
  {
    id: "ruler-maker",
    name: "Ruler / Calipers",
    desc: "Generate metric or imperial rulers, digital caliper cases, and squares.",
    category: "functional",
    icon: Ruler,
    tint: "#10B981",
    href: `${MAKERLAB_BASE}/ruler-maker`,
    tags: ["ruler", "measure"],
  },
];

const CATEGORIES = [
  { id: "all",         label: "All" },
  { id: "text",        label: "Text & Signs" },
  { id: "image",       label: "Photo → 3D" },
  { id: "sculpture",   label: "Sculpture" },
  { id: "decor",       label: "Decor" },
  { id: "functional",  label: "Functional" },
  { id: "experiment",  label: "Experiments" },
];

export default function Tools() {
  const { user, loading: authLoading } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    return TOOLS.filter(t => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!query) return true;
      return (t.name.toLowerCase().includes(query)
        || t.desc.toLowerCase().includes(query)
        || (t.tags || []).some(g => g.toLowerCase().includes(query)));
    });
  }, [q, cat]);

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" data-testid="tools-loading">
        <div className="w-6 h-6 rounded-full border-2 border-forge-border border-t-forge-primary animate-spin"/>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-16 text-center" data-testid="tools-gate">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-forge-primary/40 bg-forge-primary/15 flex items-center justify-center">
          <Wand2 className="w-8 h-8 text-forge-primary"/>
        </div>
        <div className="flex items-center gap-2 justify-center mb-2">
          <span className="chip chip-tech text-[10px]"><Lock className="w-3 h-3"/> Members only</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">AI · MakerLab</span>
        </div>
        <h1 className="font-display font-semibold text-forge-text text-3xl sm:text-4xl leading-tight mb-3">
          Sign in to open <span className="text-forge-primary">MakerLab</span>.
        </h1>
        <p className="text-forge-muted text-sm sm:text-base max-w-xl mx-auto mb-6">
          16 AI generation tools — photo to 3D, lithophanes, custom signs, puzzles, statues and more. Free to use once you're signed in.
        </p>
        <Button
          onClick={() => loginWithReturn("/tools")}
          className="btn-forge rounded-full px-6 py-5 text-sm"
          data-testid="tools-gate-signin"
        >
          <LogIn className="w-4 h-4 mr-2"/> Sign in with Google
        </Button>
        <div className="flex flex-wrap gap-1.5 justify-center mt-8 max-w-lg mx-auto">
          {TOOLS.slice(0, 8).map((t) => (
            <span key={t.id} className="chip text-[10px]">{t.name}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16" data-testid="tools-page">
      <div className="flex items-center gap-3 mb-3">
        <div className="scanline w-12"/>
        <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-forge-tech">MakerLab · Tools</span>
      </div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-forge-text text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Design with <span className="text-forge-primary">MakerLab</span>.
          </h1>
          <p className="text-forge-muted mt-2 text-sm sm:text-base max-w-2xl">
            Every generator from MakerWorld's MakerLab — signs, vases, lithophanes, scans and more. Pick a tool, design it in your browser, then send the STL back to us to print.
          </p>
        </div>
        <a
          href={MAKERLAB_BASE}
          target="_blank"
          rel="noreferrer"
          data-testid="makerlab-external"
          className="self-start btn-forge inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm"
        >
          <ExternalLink className="w-4 h-4"/> Open MakerLab
        </a>
      </div>

      {/* MakerWorld attribution + community link */}
      <a
        href="https://makerworld.com"
        target="_blank"
        rel="noreferrer"
        data-testid="makerworld-attribution"
        className="mb-8 flex items-center gap-3 sm:gap-4 rounded-2xl border border-forge-border bg-forge-surface p-4 sm:p-5 hover:border-forge-primary/60 transition group"
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-white flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 64 64" className="w-9 h-9 sm:w-10 sm:h-10" aria-hidden="true">
            {/* Simplified MakerWorld hex mark — stylised M inside a hex */}
            <defs>
              <linearGradient id="mw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"  stopColor="#00AE42"/>
                <stop offset="100%" stopColor="#008C34"/>
              </linearGradient>
            </defs>
            <polygon
              points="32,4 58,18 58,46 32,60 6,46 6,18"
              fill="url(#mw-grad)"
              stroke="#005E22"
              strokeWidth="2"
            />
            <path
              d="M18 44 V22 L28 34 L32 30 L36 34 L46 22 V44"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-forge-tech">Official partner</span>
            <span className="chip chip-tech text-[9px]">MakerWorld</span>
          </div>
          <div className="font-display text-forge-text text-base sm:text-lg leading-tight truncate">
            Tools + resources by <span className="text-forge-primary">MakerWorld</span>
          </div>
          <p className="text-forge-muted text-xs mt-0.5 line-clamp-2">
            Every generator below is powered by MakerWorld's community. Visit the official site for the full tool catalog, contests, and community models.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-forge-tech shrink-0 group-hover:text-forge-primary transition">
          Visit <ExternalLink className="w-3 h-3"/>
        </span>
      </a>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none"/>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tools — sign, vase, lithophane…"
            className="w-full bg-forge-elevated border border-forge-border rounded-full pl-9 pr-3 py-2.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
            data-testid="tools-search"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1" data-testid="tools-categories">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              data-testid={`tools-cat-${c.id}`}
              className={`shrink-0 px-3 py-2 rounded-full text-[10px] font-mono uppercase tracking-widest transition ${
                cat === c.id
                  ? "bg-forge-primary text-forge-bg"
                  : "bg-forge-elevated text-forge-muted hover:text-forge-text"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="tools-grid">
        {items.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-forge-border p-12 text-center" data-testid="tools-empty">
            <Wand2 className="w-8 h-8 text-forge-muted mx-auto mb-2"/>
            <div className="font-display text-forge-text">No tool matched.</div>
            <p className="text-forge-muted text-sm">Try a different keyword or category.</p>
          </div>
        ) : items.map((t) => {
          const Icon = t.icon;
          return (
            <a
              key={t.id}
              href={t.href}
              target="_blank"
              rel="noreferrer"
              data-testid={`tool-${t.id}`}
              className="card-forge p-5 relative group overflow-hidden hover:border-forge-primary/60 transition"
            >
              <div
                className="absolute -top-14 -right-8 w-32 h-32 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition"
                style={{ background: t.tint }}
              />
              <div className="relative flex items-start gap-3">
                <div
                  className="w-10 h-10 shrink-0 rounded-lg border border-forge-border flex items-center justify-center"
                  style={{ background: `${t.tint}22`, borderColor: `${t.tint}55` }}
                >
                  <Icon className="w-5 h-5" style={{ color: t.tint }}/>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-forge-text text-lg leading-tight truncate">{t.name}</h3>
                    <span className="chip chip-tech text-[8px] uppercase tracking-widest">{t.category}</span>
                  </div>
                  <p className="text-forge-muted text-xs sm:text-sm mb-3 line-clamp-3">{t.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-forge-primary link-underline">
                    Open in MakerLab <ExternalLink className="w-3 h-3"/>
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
