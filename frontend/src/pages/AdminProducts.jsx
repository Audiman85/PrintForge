import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, PackageOpen, ImagePlus, Trash2, Sparkles, Calculator } from "lucide-react";
import { toast } from "sonner";
import ModelPreview from "@/components/ModelPreview";
import ProductCalculator from "@/components/ProductCalculator";
import BulkCSVUpload from "@/components/BulkCSVUpload";

const SHAPES = ["torusknot", "sphere", "icosahedron", "dodecahedron", "octahedron", "cone", "cylinder", "box"];

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function loginWithGoogle() {
  const redirectUrl = window.location.origin + "/admin/products";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function AdminProducts() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "decor", price: 20.0,
    material: "PLA", image_url: "", tags_csv: "",
    print_time_hours: 4.0, print_weight_grams: 60,
    preview_shape: "torusknot", recommended_colors: 1,
  });

  useEffect(() => {
    (async () => {
      try {
        const [cats, cfg, prods] = await Promise.all([
          api.get("/categories"),
          api.get("/quote/config"),
          api.get("/products"),
        ]);
        setCategories(cats.data.filter(c => !c.coming_soon));
        setMaterials(cfg.data.materials);
        setProducts(prods.data);
      } catch {}
    })();
  }, []);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.title || !form.image_url) { toast.error("Title and image URL required"); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        price: Number(form.price),
        material: form.material,
        image_url: form.image_url.trim(),
        tags: form.tags_csv.split(",").map(t => t.trim()).filter(Boolean),
        print_time_hours: Number(form.print_time_hours),
        print_weight_grams: Number(form.print_weight_grams),
        preview_shape: form.preview_shape,
        recommended_colors: Number(form.recommended_colors),
      };
      await api.post("/products", payload);
      toast.success("Product added");
      const { data } = await api.get("/products");
      setProducts(data);
      setForm({ ...form, title: "", description: "", image_url: "", tags_csv: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  const del = async (product_id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await api.delete(`/products/${product_id}`);
      setProducts(prev => prev.filter(p => p.product_id !== product_id));
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  if (loading) return null;
  if (!user) return (
    <div className="max-w-3xl mx-auto px-6 py-24 text-center" data-testid="admin-signin-gate">
      <PackageOpen className="w-10 h-10 text-forge-primary mx-auto mb-4"/>
      <h1 className="font-display text-forge-text text-3xl mb-2">Admin — Add Products</h1>
      <p className="text-forge-muted mb-6">Sign in to manage your product catalog.</p>
      <Button onClick={loginWithGoogle} className="btn-forge rounded-full px-6" data-testid="admin-signin-btn">Sign in with Google</Button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="scanline w-12 mb-3"/>
          <h1 className="font-display font-semibold text-forge-text text-4xl">Manage Products</h1>
          <p className="text-forge-muted mt-2">Add new items to your catalog. Use the industry-standard calculator to set a fair retail price.</p>
        </div>
        <a href="#calculator" className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full border border-forge-border bg-forge-elevated text-forge-text hover:border-forge-primary text-sm">
          <Calculator className="w-4 h-4 text-forge-primary"/> Pricing calculator
        </a>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Form */}
        <form onSubmit={save} className="lg:col-span-3 card-forge p-6 space-y-4" data-testid="add-product-form">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-forge-primary"/>
            <h3 className="font-display text-forge-text text-xl">New product</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-forge-text mb-2 block">Title</Label>
              <Input value={form.title} onChange={(e)=>setField("title", e.target.value)} className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-title" required/>
            </div>
            <div className="col-span-2">
              <Label className="text-forge-text mb-2 block">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e)=>setField("description", e.target.value)} className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-desc"/>
            </div>

            <div>
              <Label className="text-forge-text mb-2 block">Category</Label>
              <Select value={form.category} onValueChange={(v)=>setField("category", v)}>
                <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-category"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-forge-surface border-forge-border text-forge-text">
                  {categories.map(c => (
                    <SelectItem key={c.code} value={c.code} data-testid={`admin-cat-${c.code}`}>
                      <span className="flex flex-col">
                        <span>{c.label}</span>
                        <span className="font-mono text-[10px] text-forge-muted">{c.desc}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-forge-text mb-2 block">Material</Label>
              <Select value={form.material} onValueChange={(v)=>setField("material", v)}>
                <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-material"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-forge-surface border-forge-border text-forge-text max-h-72">
                  {materials.map(m => <SelectItem key={m.name} value={m.name}>{m.name}{m.single_colour_only ? ` (${m.available_colors[0]} only)` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-forge-text mb-2 block">Price (USD)</Label>
              <Input type="number" step="0.5" min={0} value={form.price} onChange={(e)=>setField("price", e.target.value)} className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-price"/>
            </div>

            <div>
              <Label className="text-forge-text mb-2 block">Print time (hours)</Label>
              <Input type="number" step="0.5" min={0.5} value={form.print_time_hours} onChange={(e)=>setField("print_time_hours", e.target.value)} className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-time"/>
            </div>

            <div>
              <Label className="text-forge-text mb-2 block">Weight (g)</Label>
              <Input type="number" min={1} value={form.print_weight_grams} onChange={(e)=>setField("print_weight_grams", e.target.value)} className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-weight"/>
            </div>

            <div>
              <Label className="text-forge-text mb-2 block">3D preview shape</Label>
              <Select value={form.preview_shape} onValueChange={(v)=>setField("preview_shape", v)}>
                <SelectTrigger className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-shape"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-forge-surface border-forge-border text-forge-text">
                  {SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-forge-text">Recommended colours</Label>
                <span className="font-mono text-sm text-forge-primary">{form.recommended_colors}</span>
              </div>
              <Slider min={1} max={8} step={1} value={[form.recommended_colors]} onValueChange={(v)=>setField("recommended_colors", v[0])} data-testid="admin-colors"/>
            </div>

            <div className="col-span-2">
              <Label className="text-forge-text mb-2 block flex items-center gap-1"><ImagePlus className="w-3 h-3"/> Image URL</Label>
              <Input value={form.image_url} onChange={(e)=>setField("image_url", e.target.value)} placeholder="https://images.unsplash.com/…" className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-image"/>
            </div>

            <div className="col-span-2">
              <Label className="text-forge-text mb-2 block">Tags (comma-separated)</Label>
              <Input value={form.tags_csv} onChange={(e)=>setField("tags_csv", e.target.value)} placeholder="lamp, decor, geometric" className="bg-forge-elevated border-forge-border text-forge-text" data-testid="admin-tags"/>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="btn-forge rounded-full px-6 py-6 text-base w-full sm:w-auto" data-testid="admin-save-btn">
            <Sparkles className="w-4 h-4 mr-2"/> {saving ? "Adding…" : "Add to catalog"}
          </Button>
        </form>

        {/* Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-forge overflow-hidden">
            <ModelPreview shape={form.preview_shape} colors={["#FF6B00"]} quality="regular" nozzleMm={0.4} height={280}/>
          </div>
          <div className="card-forge p-4 space-y-2" data-testid="admin-preview-card">
            <div className="scanline w-8"/>
            <div className="font-display text-forge-text text-lg">{form.title || "New Product Title"}</div>
            <div className="font-mono text-forge-primary text-2xl font-semibold">${Number(form.price).toFixed(2)}</div>
            <p className="text-xs text-forge-muted line-clamp-3">{form.description || "Description preview…"}</p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="chip chip-tech">{form.material}</span>
              <span className="chip">{form.print_weight_grams}g</span>
              <span className="chip">{form.print_time_hours}h</span>
              <span className="chip">{categories.find(c=>c.code===form.category)?.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Existing products */}
      <div className="mt-12 space-y-6">
        <BulkCSVUpload onImported={async () => {
          try { const { data } = await api.get("/products"); setProducts(data); } catch {}
        }}/>
        <div>
          <h3 className="font-display text-forge-text text-2xl mb-4">Current catalog · {products.length} items</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="admin-product-list">
          {products.map(p => (
            <div key={p.product_id} className="card-forge p-4 flex items-center gap-3">
              <img src={p.image_url} alt={p.title} className="w-14 h-14 rounded object-cover"/>
              <div className="flex-1 min-w-0">
                <div className="font-display text-forge-text truncate">{p.title}</div>
                <div className="font-mono text-xs text-forge-muted">${p.price} · {p.category} · {p.material}</div>
              </div>
              <button onClick={()=>del(p.product_id, p.title)} className="p-2 rounded-full text-forge-muted hover:text-forge-primary hover:bg-forge-elevated transition" data-testid={`admin-del-${p.product_id}`} title="Delete">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
