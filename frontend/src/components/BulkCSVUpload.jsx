import { useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Loader2, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

export default function BulkCSVUpload({ onImported }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const onPick = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("CSV file only");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/products/bulk", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(data);
      if (data.inserted > 0) {
        toast.success(`Imported ${data.inserted} product${data.inserted > 1 ? "s" : ""}`);
        onImported?.();
      } else {
        toast(`No rows imported (${data.errors?.length || 0} errors)`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-forge p-5 space-y-4" data-testid="bulk-upload">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-forge-primary"/>
          <h3 className="font-display text-forge-text text-lg">Bulk import — CSV</h3>
        </div>
        <a
          href={`${process.env.REACT_APP_BACKEND_URL}/api/products/bulk/template`}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-forge-tech hover:text-forge-primary transition"
          data-testid="bulk-template-link"
        >
          <Download className="w-3 h-3"/> Template
        </a>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onPick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
          dragOver ? "border-forge-primary bg-forge-primary/5" : "border-forge-border bg-forge-elevated hover:border-forge-primary/60"
        }`}
        data-testid="bulk-dropzone"
      >
        <UploadCloud className="w-8 h-8 text-forge-primary mx-auto mb-2"/>
        <div className="font-display text-forge-text text-sm">
          {file ? file.name : "Drop CSV here or click to browse"}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-forge-muted mt-1">
          UTF-8 · max 5MB
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
          data-testid="bulk-file-input"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-mono text-forge-muted">
          Required columns: <span className="text-forge-text">title · description · category · price · print_time_hours · print_weight_grams</span>
        </p>
        <Button
          onClick={submit}
          disabled={!file || busy}
          className="btn-forge rounded-full px-5"
          data-testid="bulk-submit"
        >
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Importing…</>
                : <>Import CSV</>}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border border-forge-border bg-forge-bg p-4 space-y-2" data-testid="bulk-result">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-forge-primary"/>
            <span className="font-display text-forge-text text-sm">
              {result.inserted} added
              {result.errors?.length ? ` · ${result.errors.length} errored` : ""}
            </span>
          </div>
          {result.errors?.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1" data-testid="bulk-errors">
              {result.errors.slice(0, 10).map((er, i) => (
                <div key={i} className="text-[11px] font-mono text-forge-muted flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 text-forge-primary shrink-0"/>
                  Row {er.row}: {er.error}
                </div>
              ))}
              {result.errors.length > 10 && (
                <div className="text-[11px] font-mono text-forge-faint">… and {result.errors.length - 10} more</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
