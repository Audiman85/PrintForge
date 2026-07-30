import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Heart, Download, FileBox } from "lucide-react";
import { toast } from "sonner";
import ShareButtons from "@/components/ShareButtons";
import SupporterBadge from "@/components/SupporterBadge";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function loginWithGoogle() {
  const redirectUrl = window.location.origin + "/community";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function Community() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/designs");
      setDesigns(data);
    } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const like = async (id) => {
    if (!user) { toast("Sign in to like designs"); return; }
    try {
      const { data } = await api.post(`/designs/${id}/like`);
      setDesigns(prev => prev.map(d => d.design_id === id ? { ...d, likes: d.likes + (data.liked ? 1 : -1) } : d));
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <div className="scanline w-12 mb-3"/>
          <h1 className="font-display font-semibold text-forge-text text-4xl sm:text-5xl">Community Designs</h1>
          <p className="text-forge-muted mt-3 max-w-2xl">Discover, download and remix original 3D creations uploaded by the PrintForge community.</p>
        </div>
        {user ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="btn-forge rounded-full px-5" data-testid="upload-design-btn"><Upload className="w-4 h-4 mr-2"/> Upload a design</Button>
            </DialogTrigger>
            <UploadDialog onDone={() => { setOpen(false); load(); }}/>
          </Dialog>
        ) : (
          <Button className="btn-forge rounded-full px-5" onClick={loginWithGoogle} data-testid="signin-to-upload-btn">Sign in to upload</Button>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_,i)=><div key={i} className="card-forge h-72 animate-pulse"/>)}</div>
      ) : designs.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-forge-border rounded-xl">
          <FileBox className="w-10 h-10 text-forge-muted mx-auto mb-3"/>
          <p className="text-forge-muted mb-4">No community designs yet — be the first to share.</p>
          {user && <Button className="btn-forge rounded-full px-5" onClick={()=>setOpen(true)}>Upload a design</Button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="designs-grid">
          {designs.map(d => (
            <div key={d.design_id} className="card-forge overflow-hidden" data-testid={`design-${d.design_id}`}>
              <div className="aspect-[4/3] bg-forge-elevated relative overflow-hidden">
                <img
                  src={d.preview_path ? `${process.env.REACT_APP_BACKEND_URL}/api/files/download?path=${encodeURIComponent(d.preview_path)}` : "https://images.unsplash.com/photo-1518732714860-b62714ce0c59?w=600"}
                  alt={d.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = "1";
                      e.currentTarget.src = "https://images.unsplash.com/photo-1518732714860-b62714ce0c59?w=600";
                    }
                  }}
                />
                <div className="absolute top-3 left-3"><span className="chip chip-tech">USER</span></div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-forge-text text-lg leading-tight line-clamp-1">{d.title}</h3>
                </div>
                <p className="text-xs text-forge-muted font-mono flex items-center gap-1.5">
                  by {d.author_name}
                  {d.author_email && supporterEmails.has((d.author_email || "").toLowerCase()) && (
                    <SupporterBadge compact/>
                  )}
                </p>
                <p className="text-sm text-forge-muted line-clamp-2">{d.description || "No description"}</p>
                <div className="flex flex-wrap gap-1.5">{(d.tags||[]).slice(0,3).map(t=><span key={t} className="chip text-[9px]">#{t}</span>)}</div>
                <div className="flex items-center justify-between pt-2 border-t border-forge-border/60">
                  <button onClick={()=>like(d.design_id)} className="flex items-center gap-1.5 text-sm text-forge-muted hover:text-forge-primary transition" data-testid={`like-${d.design_id}`}>
                    <Heart className="w-4 h-4"/> {d.likes || 0}
                  </button>
                  <div className="flex items-center gap-2">
                    <ShareButtons
                      url={`${window.location.origin}/community#${d.design_id}`}
                      title={`${d.title} — free 3D design on PrintForge`}
                      compact
                    />
                    <a href={`${process.env.REACT_APP_BACKEND_URL}/api/files/download?path=${encodeURIComponent(d.storage_path)}`} className="flex items-center gap-1.5 text-sm text-forge-tech hover:text-forge-primary transition" data-testid={`download-${d.design_id}`}>
                      <Download className="w-4 h-4"/> Download
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadDialog({ onDone }) {
  const [form, setForm] = useState({ title: "", description: "", tags: "", is_public: true });
  const [model, setModel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !model) { toast.error("Title and model file required"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("tags", form.tags);
      fd.append("is_public", String(form.is_public));
      fd.append("model_file", model);
      if (preview) fd.append("preview_image", preview);
      await api.post("/designs", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Design uploaded");
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally { setSubmitting(false); }
  };

  return (
    <DialogContent className="bg-forge-surface border-forge-border text-forge-text max-w-lg">
      <DialogHeader><DialogTitle className="font-display">Share your design</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="bg-forge-elevated border-forge-border text-forge-text mt-2" data-testid="design-title-input" required/>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="bg-forge-elevated border-forge-border text-forge-text mt-2" data-testid="design-desc-input"/>
        </div>
        <div>
          <Label>Tags (comma-separated)</Label>
          <Input value={form.tags} onChange={(e)=>setForm({...form,tags:e.target.value})} placeholder="fantasy, dragon, flexi" className="bg-forge-elevated border-forge-border text-forge-text mt-2" data-testid="design-tags-input"/>
        </div>
        <div>
          <Label>Model file (STL/OBJ/3MF, max 60MB)</Label>
          <Input type="file" accept=".stl,.obj,.3mf,.step,.stp,.zip" onChange={(e)=>setModel(e.target.files?.[0])} className="bg-forge-elevated border-forge-border text-forge-text mt-2 file:text-forge-primary" required data-testid="design-model-input"/>
        </div>
        <div>
          <Label>Preview image (optional)</Label>
          <Input type="file" accept="image/*" onChange={(e)=>setPreview(e.target.files?.[0])} className="bg-forge-elevated border-forge-border text-forge-text mt-2 file:text-forge-primary" data-testid="design-preview-input"/>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-forge-elevated border border-forge-border">
          <div>
            <p className="text-sm">Public in gallery</p>
            <p className="text-xs text-forge-muted">Share with community & allow downloads</p>
          </div>
          <Switch checked={form.is_public} onCheckedChange={(v)=>setForm({...form,is_public:v})} data-testid="public-switch"/>
        </div>
        <Button type="submit" className="btn-forge w-full rounded-full py-6" disabled={submitting} data-testid="submit-design-btn">
          {submitting ? "Uploading…" : "Publish design"}
        </Button>
      </form>
    </DialogContent>
  );
}
