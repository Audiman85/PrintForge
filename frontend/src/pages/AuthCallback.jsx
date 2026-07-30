import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { consumeReturnPath } from "@/lib/authRedirect";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    const sessionId = params.get("session_id");
    if (!sessionId) { navigate("/", { replace: true }); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        if (data.session_token) localStorage.setItem("session_token", data.session_token);
        setUser(data.user);
        const dest = consumeReturnPath("/dashboard");
        window.history.replaceState(null, "", dest);
        navigate(dest, { replace: true, state: { user: data.user } });
      } catch (e) {
        navigate("/", { replace: true });
      }
    })();
  }, [location, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-forge-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-forge-muted font-mono text-sm">Forging your session…</p>
      </div>
    </div>
  );
}
