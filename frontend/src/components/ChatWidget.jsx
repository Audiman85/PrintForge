import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { LANGUAGES } from "@/i18n";
import { MessageCircle, Send, X, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function loginWithGoogle() {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function ChatWidget({ openState, onOpenChange }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openState !== undefined ? openState : openInternal;
  const setOpen = (v) => { if (onOpenChange) onOpenChange(v); else setOpenInternal(v); };
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showOriginal, setShowOriginal] = useState({});
  const listRef = useRef(null);
  const lastFetchRef = useRef(null);

  const viewLang = i18n.language || "en";

  const fetchMessages = async () => {
    if (!user) return;
    try {
      const params = {};
      if (lastFetchRef.current) params.since = lastFetchRef.current;
      const { data } = await api.get("/chat/messages", { params });
      if (data.messages?.length) {
        setMessages(prev => {
          const seen = new Set(prev.map(m => m.message_id));
          const fresh = data.messages.filter(m => !seen.has(m.message_id));
          if (!fresh.length) return prev;
          lastFetchRef.current = fresh[fresh.length - 1].created_at;
          return [...prev, ...fresh];
        });
      } else if (!lastFetchRef.current && messages.length === 0) {
        lastFetchRef.current = new Date().toISOString();
      }
    } catch {}
  };

  useEffect(() => {
    if (!open || !user) return;
    fetchMessages();
    const t = setInterval(fetchMessages, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [open, user]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const outgoing = text.trim();
    setText("");
    // optimistic
    const tempId = "temp_" + Date.now();
    setMessages(prev => [...prev, {
      message_id: tempId, sender_role: "customer",
      sender_name: user.name, original_text: outgoing,
      original_language: viewLang, translations: {},
      created_at: new Date().toISOString(), pending: true,
    }]);
    try {
      const { data } = await api.post("/chat/messages", { text: outgoing, language: viewLang });
      setMessages(prev => prev.map(m => m.message_id === tempId ? data : m));
      lastFetchRef.current = data.created_at;
    } catch (err) {
      toast.error("Failed to send");
      setMessages(prev => prev.filter(m => m.message_id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const displayFor = (m) => {
    const wantOriginal = showOriginal[m.message_id];
    if (wantOriginal) return { text: m.original_text, translated: false };
    if (m.original_language === viewLang) return { text: m.original_text, translated: false };
    const tr = m.translations?.[viewLang];
    if (tr) return { text: tr, translated: true, from: m.original_language };
    return { text: m.original_text, translated: false };
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="chat-open-btn"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full btn-forge shadow-2xl flex items-center justify-center animate-forge-pulse"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6"/>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[80vh] card-forge flex flex-col overflow-hidden" data-testid="chat-widget">
      <div className="p-4 border-b border-forge-border flex items-center justify-between bg-forge-elevated">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-forge-primary/15 border border-forge-primary flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-forge-primary"/>
          </div>
          <div className="min-w-0">
            <div className="font-display text-forge-text truncate">{t("chat.title")}</div>
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-forge-tech">
              <Globe className="w-3 h-3"/> {t("chat.langbar")}: {LANGUAGES.find(l => l.code === viewLang)?.native || viewLang}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} data-testid="chat-close-btn" className="p-1.5 rounded hover:bg-forge-surface"><X className="w-4 h-4"/></button>
      </div>

      {!user ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <MessageCircle className="w-10 h-10 text-forge-muted mb-3"/>
          <p className="text-forge-muted mb-4">{t("chat.signin_required")}</p>
          <button onClick={loginWithGoogle} className="btn-forge px-5 py-2 rounded-full" data-testid="chat-signin-btn">
            {t("nav.signin")}
          </button>
        </div>
      ) : (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
            {messages.length === 0 && (
              <p className="text-center text-forge-muted text-sm px-4 py-8">{t("chat.empty")}</p>
            )}
            {messages.map(m => {
              const isMe = m.sender_role !== "owner";
              const d = displayFor(m);
              return (
                <div key={m.message_id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${isMe ? "bg-forge-primary text-forge-bg rounded-br-sm" : "bg-forge-elevated text-forge-text border border-forge-border rounded-bl-sm"} ${m.pending ? "opacity-60" : ""}`}>
                      {d.text}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-forge-muted">
                      <span>{isMe ? t("chat.you") : (m.sender_name || t("chat.owner"))}</span>
                      {d.translated && (
                        <>
                          <span>·</span>
                          <span>{t("chat.translated_from")} {d.from?.toUpperCase()}</span>
                        </>
                      )}
                      {(m.original_language !== viewLang && m.translations?.[viewLang]) && (
                        <button
                          onClick={() => setShowOriginal(s => ({...s, [m.message_id]: !s[m.message_id]}))}
                          className="hover:text-forge-primary underline decoration-dotted"
                          data-testid={`toggle-orig-${m.message_id}`}
                        >
                          {showOriginal[m.message_id] ? t("chat.show_translation") : t("chat.show_original")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} className="p-3 border-t border-forge-border bg-forge-elevated flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("chat.placeholder")}
              className="flex-1 bg-forge-bg border border-forge-border rounded-full px-4 py-2 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
              disabled={sending}
              data-testid="chat-input"
            />
            <button type="submit" disabled={sending || !text.trim()} className="btn-forge rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-40" data-testid="chat-send-btn">
              {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
