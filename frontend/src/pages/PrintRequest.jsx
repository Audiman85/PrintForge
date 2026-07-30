import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { UploadCloud, FileBox, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import StlPreview from "@/components/StlPreview";

const MATERIALS = ["PLA","PETG","ABS","TPU","Resin","Wood-PLA","Silk-PLA"];
const COLORS = ["Any","Black","White","Grey","Red","Blue","Green","Yellow","Orange","Purple","Multi"];

export default function PrintRequest() {
  const [params] = useSearchParams();
  const productId = params.get("product") || "";
  const { user } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [form, setForm] = useState({
    contact_name: user?.name || "",
    contact_email: user?.email || "",
    material: "PLA",
    color: "Any",
    quantity: 1,
    custom_notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  };
  const validateAndSet = (f) => {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["stl","obj","3mf","step","stp","zip"].includes(ext)) { toast.error("Only STL/OBJ/3MF/STEP/ZIP files"); return; }
    if (f.size > 60*1024*1024) { toast.error("Max 60MB"); return; }
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.contact_name || !form.contact_email) { toast.error("Name and email required"); return; }
    if (!file && !productId) { toast.error("Attach a file or start from a product"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v])=>fd.append(k, String(v)));
      if (productId) fd.append("product_id", productId);
      if (file) fd.append("file", file);
      const { data } = await api.post("/orders", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setConfirmation(data);
      toast.success("Print job received");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally { setSubmitting(false); }
  };

  if (confirmation) return (
    <div className="max-w-3xl mx-auto px-6 py-24 text-center" data-testid="order-confirmation">
      <div className="w-16 h-16 rounded-full bg-forge-primary/10 border border-forge-primary flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-8 h-8 text-forge-primary"/>
      </div>
      <div className="scanline w-12 mx-auto mb-3"/>
      <h1 className="font-display text-forge-text text-4xl mb-3">Print job received</h1>
      <p className="text-forge-muted">Order ID: <span className="font-mono text-forge-primary">{confirmation.order_id}</span></p>
      <p className="text-forge-muted mt-2">We'll email you a slicing quote and estimated shipping timeline within 24 hours.</p>
      <div className="flex justify-center gap-3 mt-8">
        <Button onClick={()=>navigate("/dashboard?tab=orders")} className="btn-forge rounded-full px-6" data-testid="view-orders-btn">View my orders</Button>
        <Button variant="outline" onClick={()=>{ setConfirmation(null); setFile(null); }} className="rounded-full px-6 border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text">Send another</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="scanline w-16 mb-3"/>
      <h1 className="font-display font-semibold text-forge-text text-4xl sm:text-5xl">Send us a file to print</h1>
      <p className="text-forge-muted mt-3 max-w-2xl">Upload your STL / OBJ / 3MF file, pick a material and colour, and we'll print & ship it. No account needed to submit, but signing in lets you track orders.</p>

      <form onSubmit={submit} className="mt-10 grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div
            className={`dropzone ${drag ? "active" : ""} p-8 flex flex-col items-center justify-center text-center min-h-[220px]`}
            onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onDrop={onDrop}
            data-testid="dropzone"
          >
            {!file ? (
              <>
                <UploadCloud className="w-10 h-10 text-forge-primary mb-4"/>
                <p className="font-display text-xl text-forge-text mb-1">Drop your 3D file here</p>
                <p className="text-sm text-forge-muted mb-4">STL · OBJ · 3MF · STEP · ZIP · up to 60MB</p>
                <label className="btn-forge rounded-full px-5 py-2 cursor-pointer">
                  Choose file
                  <input type="file" className="hidden" onChange={(e)=>e.target.files?.[0] && validateAndSet(e.target.files[0])} data-testid="file-input"/>
                </label>
              </>
            ) : (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileBox className="w-8 h-8 text-forge-primary"/>
                    <div className="text-left">
                      <p className="font-display text-forge-text">{file.name}</p>
                      <p className="text-xs text-forge-muted font-mono">{(file.size/1024/1024).toFixed(2)} MB · {file.name.split(".").pop().toUpperCase()}</p>
                    </div>
                  </div>
                  <button type="button" onClick={()=>setFile(null)} className="p-2 rounded-full hover:bg-forge-elevated" data-testid="remove-file-btn"><X className="w-4 h-4"/></button>
                </div>
                <StlPreview file={file} color="#FF6B00" height={320}/>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-forge-text">Material</Label>
              <Select value={form.material} onValueChange={(v)=>setForm({...form, material:v})}>
                <SelectTrigger className="bg-forge-surface border-forge-border text-forge-text mt-2" data-testid="material-select"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-forge-surface border-forge-border text-forge-text">
                  {MATERIALS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-forge-text">Colour</Label>
              <Select value={form.color} onValueChange={(v)=>setForm({...form, color:v})}>
                <SelectTrigger className="bg-forge-surface border-forge-border text-forge-text mt-2" data-testid="color-select"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-forge-surface border-forge-border text-forge-text">
                  {COLORS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-forge-text">Quantity</Label>
            <Input type="number" min={1} max={50} value={form.quantity} onChange={(e)=>setForm({...form, quantity:Number(e.target.value)||1})} className="bg-forge-surface border-forge-border text-forge-text mt-2" data-testid="quantity-input"/>
          </div>
          <div>
            <Label className="text-forge-text">Notes (finish, dimensions, deadline…)</Label>
            <Textarea rows={4} value={form.custom_notes} onChange={(e)=>setForm({...form, custom_notes:e.target.value})} className="bg-forge-surface border-forge-border text-forge-text mt-2" data-testid="notes-input"/>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card-forge p-6 space-y-4">
            <h3 className="font-display text-forge-text text-lg">Contact details</h3>
            <div>
              <Label className="text-forge-text">Name</Label>
              <Input required value={form.contact_name} onChange={(e)=>setForm({...form, contact_name:e.target.value})} className="bg-forge-surface border-forge-border text-forge-text mt-2" data-testid="contact-name-input"/>
            </div>
            <div>
              <Label className="text-forge-text">Email</Label>
              <Input required type="email" value={form.contact_email} onChange={(e)=>setForm({...form, contact_email:e.target.value})} className="bg-forge-surface border-forge-border text-forge-text mt-2" data-testid="contact-email-input"/>
            </div>
            <Button type="submit" className="btn-forge w-full rounded-full py-6" disabled={submitting} data-testid="submit-order-btn">
              {submitting ? "Submitting…" : "Submit print job"}
            </Button>
            <p className="text-xs text-forge-muted">By submitting you agree to a manual quote review. No charges until you approve the quote.</p>
          </div>
          <div className="card-forge p-5 space-y-2">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-forge-tech">What happens next</h4>
            <ol className="text-sm text-forge-muted space-y-1.5 list-decimal list-inside">
              <li>We slice the model and generate a quote</li>
              <li>You approve the quote via email</li>
              <li>We print, QA, and ship to your door</li>
            </ol>
          </div>
        </div>
      </form>
    </div>
  );
}
