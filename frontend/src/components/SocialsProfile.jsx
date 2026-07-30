import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Twitter, Instagram, Facebook, Youtube, Globe, ExternalLink, Save, Music2 } from "lucide-react";
import { toast } from "sonner";
import ShareButtons from "@/components/ShareButtons";

const FIELDS = [
  { key: "twitter",   label: "X / Twitter",  icon: Twitter,   prefix: "@",              url: v => `https://twitter.com/${v.replace(/^@/, "")}` },
  { key: "instagram", label: "Instagram",    icon: Instagram, prefix: "@",              url: v => `https://instagram.com/${v.replace(/^@/, "")}` },
  { key: "facebook",  label: "Facebook",     icon: Facebook,  prefix: "facebook.com/",  url: v => `https://facebook.com/${v}` },
  { key: "tiktok",    label: "TikTok",       icon: Music2,    prefix: "@",              url: v => `https://tiktok.com/@${v.replace(/^@/, "")}` },
  { key: "youtube",   label: "YouTube",      icon: Youtube,   prefix: "@",              url: v => `https://youtube.com/${v.startsWith("@") ? v : "@" + v}` },
  { key: "website",   label: "Website",      icon: Globe,     prefix: "https://",       url: v => v.startsWith("http") ? v : `https://${v}` },
];

export default function SocialsProfile({ user }) {
  const [socials, setSocials] = useState({});
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/profile/socials");
        setSocials(data || {});
        setBio(data?.bio || "");
      } finally { setLoaded(true); }
    })();
  }, []);

  const set = (k, v) => setSocials(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/profile/socials", { ...socials, bio });
      toast.success("Profile saved");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const profileUrl = `${window.location.origin}/#profile-${user?.user_id || ""}`;
  const activeSocials = FIELDS.filter(f => socials[f.key]);

  if (!loaded) return <div className="card-forge p-6 h-64 animate-pulse"/>;

  return (
    <div className="grid lg:grid-cols-5 gap-6" data-testid="socials-profile">
      {/* Left: profile preview card */}
      <div className="lg:col-span-2 card-forge overflow-hidden">
        <div className="relative h-24 bg-gradient-to-br from-forge-primary/40 via-forge-tech/20 to-transparent"/>
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end justify-between gap-3 mb-3">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full border-4 border-forge-surface bg-forge-elevated"/>
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-forge-surface bg-forge-elevated"/>
            )}
            <ShareButtons url={profileUrl} title={`${user.name} on PrintForge`} label="Share profile"/>
          </div>
          <div className="font-display text-forge-text text-xl">{user.name}</div>
          <div className="font-mono text-xs text-forge-muted">{user.email}</div>
          {bio && <p className="mt-3 text-sm text-forge-muted leading-relaxed">{bio}</p>}

          {activeSocials.length > 0 && (
            <div className="mt-4 pt-4 border-t border-forge-border">
              <div className="font-mono text-[10px] uppercase tracking-widest text-forge-tech mb-2">Find me on</div>
              <div className="flex flex-wrap gap-2">
                {activeSocials.map(f => {
                  const Icon = f.icon;
                  return (
                    <a
                      key={f.key}
                      href={f.url(socials[f.key])}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forge-elevated border border-forge-border hover:border-forge-primary transition text-xs font-mono"
                      data-testid={`social-link-${f.key}`}
                    >
                      <Icon className="w-3.5 h-3.5 text-forge-tech"/>
                      <span className="text-forge-text">{socials[f.key]}</span>
                      <ExternalLink className="w-3 h-3 text-forge-muted"/>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: editor */}
      <div className="lg:col-span-3 card-forge p-6 space-y-4">
        <div>
          <div className="scanline w-10 mb-2"/>
          <h3 className="font-display text-xl text-forge-text">Your public profile</h3>
          <p className="text-sm text-forge-muted mt-1">Add your socials — visible on the profile card and share links.</p>
        </div>

        <div>
          <Label className="text-forge-text mb-2 block">Short bio</Label>
          <Textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Maker, remixer, coffee-fuelled printer wrangler…"
            className="bg-forge-elevated border-forge-border text-forge-text"
            data-testid="bio-input"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {FIELDS.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.key}>
                <Label className="text-forge-text mb-2 flex items-center gap-2 text-sm">
                  <Icon className="w-3.5 h-3.5 text-forge-tech"/> {f.label}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-forge-muted pointer-events-none">{f.prefix}</span>
                  <Input
                    value={socials[f.key] || ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="bg-forge-elevated border-forge-border text-forge-text pl-[68px]"
                    style={{ paddingLeft: `${f.prefix.length * 8 + 16}px` }}
                    placeholder="handle"
                    data-testid={`social-input-${f.key}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <Button onClick={save} disabled={saving} className="btn-forge rounded-full px-6" data-testid="save-socials-btn">
          <Save className="w-4 h-4 mr-2"/> {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
