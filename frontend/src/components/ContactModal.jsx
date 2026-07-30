import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { Mail, Phone, MapPin, Clock, MessageCircle, Facebook, Instagram, Twitter } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function ContactModal({ open, onOpenChange, onOpenChat }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!open || info) return;
    (async () => {
      try { const { data } = await api.get("/contact"); setInfo(data); } catch {}
    })();
  }, [open, info]);

  const messengerHref = info?.facebook_page_id ? `https://m.me/${info.facebook_page_id}` : "#";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-forge-surface border-forge-border text-forge-text max-w-lg" data-testid="contact-modal">
        <DialogHeader>
          <div className="scanline w-12 mb-2"/>
          <DialogTitle className="font-display text-forge-text text-2xl">Contact PrintForge</DialogTitle>
          <p className="text-sm text-forge-muted">Reach the maker directly — instant chat, Messenger, email, or phone. Auto-translated in your language.</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => { onOpenChange(false); onOpenChat?.(); }}
            className="p-4 rounded-xl border border-forge-primary bg-forge-primary/10 text-left hover:bg-forge-primary/15 transition group"
            data-testid="contact-live-chat"
          >
            <MessageCircle className="w-6 h-6 text-forge-primary mb-2"/>
            <div className="font-display text-forge-text">Live Chat</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-forge-muted mt-1">Auto-translated · 12 langs</div>
          </button>
          <a
            href={messengerHref}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-xl border border-forge-border bg-forge-elevated text-left hover:border-forge-tech transition group"
            data-testid="contact-messenger"
          >
            <Facebook className="w-6 h-6 text-forge-tech mb-2"/>
            <div className="font-display text-forge-text">FB Messenger</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-forge-muted mt-1">m.me/{info?.facebook_page_id || "printforge"}</div>
          </a>
        </div>

        {info && (
          <div className="grid grid-cols-1 gap-2 mt-3 p-4 rounded-xl bg-forge-elevated border border-forge-border" data-testid="contact-info">
            <a href={`mailto:${info.email}`} className="flex items-center gap-3 py-1.5 hover:text-forge-primary transition">
              <Mail className="w-4 h-4 text-forge-tech"/>
              <span className="font-mono text-sm">{info.email}</span>
            </a>
            <a href={`tel:${info.phone.replace(/\s/g,"")}`} className="flex items-center gap-3 py-1.5 hover:text-forge-primary transition">
              <Phone className="w-4 h-4 text-forge-tech"/>
              <span className="font-mono text-sm">{info.phone}</span>
            </a>
            <div className="flex items-center gap-3 py-1.5 text-forge-muted">
              <Clock className="w-4 h-4 text-forge-tech"/>
              <span className="font-mono text-sm">{info.hours}</span>
            </div>
            <div className="flex items-center gap-3 py-1.5 text-forge-muted">
              <MapPin className="w-4 h-4 text-forge-tech"/>
              <span className="font-mono text-sm">{info.address}</span>
            </div>
          </div>
        )}

        {info?.socials && (
          <div className="flex items-center gap-3 justify-center pt-2" data-testid="contact-socials">
            {info.socials.facebook && <a href={`https://facebook.com/${info.socials.facebook}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-forge-elevated border border-forge-border flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition"><Facebook className="w-4 h-4"/></a>}
            {info.socials.instagram && <a href={`https://instagram.com/${info.socials.instagram}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-forge-elevated border border-forge-border flex items-center justify-center hover:bg-[#E1306C] hover:text-white transition"><Instagram className="w-4 h-4"/></a>}
            {info.socials.twitter && <a href={`https://twitter.com/${info.socials.twitter}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-forge-elevated border border-forge-border flex items-center justify-center hover:bg-forge-text hover:text-forge-bg transition"><Twitter className="w-4 h-4"/></a>}
          </div>
        )}
        <Button onClick={() => onOpenChange(false)} variant="outline" className="border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text rounded-full mt-2" data-testid="contact-close-btn">Close</Button>
      </DialogContent>
    </Dialog>
  );
}
