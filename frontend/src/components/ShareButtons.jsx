import { useState } from "react";
import { Facebook, Twitter, Linkedin, Share2, Link2, Mail, MessageCircle, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "sonner";

// Compact share menu for products / saved designs / cart items.
// Uses standard share intent URLs so nothing extra is loaded.
export default function ShareButtons({ url, title = "Check this out on PrintForge", label = "Share", compact = false }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encoded = encodeURIComponent(shareUrl);
  const encTitle = encodeURIComponent(title);

  const targets = [
    { key: "facebook",  label: "Facebook",  icon: Facebook,      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,            color: "#1877F2" },
    { key: "twitter",   label: "X",         icon: Twitter,       href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encTitle}`,   color: "#EDEDF0" },
    { key: "whatsapp",  label: "WhatsApp",  icon: MessageCircle, href: `https://api.whatsapp.com/send?text=${encTitle}%20${encoded}`,        color: "#25D366" },
    { key: "linkedin",  label: "LinkedIn",  icon: Linkedin,      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,     color: "#0A66C2" },
    { key: "reddit",    label: "Reddit",    icon: Share2,        href: `https://reddit.com/submit?url=${encoded}&title=${encTitle}`,         color: "#FF4500" },
    { key: "pinterest", label: "Pinterest", icon: Share2,        href: `https://pinterest.com/pin/create/button/?url=${encoded}&description=${encTitle}`, color: "#E60023" },
    { key: "email",     label: "Email",     icon: Mail,          href: `mailto:?subject=${encTitle}&body=${encoded}`,                        color: "#EDEDF0" },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1600);
    } catch { toast.error("Copy failed"); }
  };

  const open = (href) => {
    window.open(href, "_blank", "noopener,noreferrer,width=640,height=520");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url: shareUrl }); } catch {}
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          data-testid="share-btn-trigger"
          className={`inline-flex items-center gap-2 ${compact
            ? "w-9 h-9 rounded-full bg-forge-bg/60 backdrop-blur-md text-forge-text hover:bg-forge-primary hover:text-forge-bg justify-center transition"
            : "px-4 py-2 rounded-full border border-forge-border bg-forge-elevated text-forge-text hover:border-forge-primary transition text-sm"}`}
        >
          <Share2 className="w-4 h-4"/>
          {!compact && <span>{label}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-64 bg-forge-surface border-forge-border text-forge-text p-3" align="end" data-testid="share-menu"
      >
        <div className="grid grid-cols-4 gap-2 mb-3">
          {targets.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => open(t.href)}
                data-testid={`share-${t.key}`}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-forge-elevated transition"
                title={t.label}
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{background: t.color === "#EDEDF0" ? "#1C1C21" : t.color}}>
                  <Icon className="w-4 h-4" style={{color: t.color === "#EDEDF0" ? "#EDEDF0" : "#fff"}}/>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-forge-muted">{t.label}</span>
              </button>
            );
          })}
          {navigator.share && (
            <button
              onClick={nativeShare}
              data-testid="share-native"
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-forge-elevated transition"
              title="More"
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center bg-forge-primary">
                <Share2 className="w-4 h-4 text-forge-bg"/>
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-forge-muted">More</span>
            </button>
          )}
        </div>
        <button
          onClick={copy}
          data-testid="share-copy"
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-forge-elevated border border-forge-border hover:border-forge-primary transition text-sm"
        >
          <span className="flex items-center gap-2 text-forge-muted"><Link2 className="w-3.5 h-3.5"/> Copy link</span>
          {copied ? <Check className="w-4 h-4 text-forge-tech"/> : <span className="font-mono text-[10px] uppercase text-forge-muted">click</span>}
        </button>
      </PopoverContent>
    </Popover>
  );
}
