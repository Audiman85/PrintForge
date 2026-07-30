import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, HandHeart, Loader2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const POLL_MS = 2000;
const MAX_ATTEMPTS = 10;

export default function DonateSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("polling");   // polling | paid | timeout | error
  const [amountCents, setAmountCents] = useState(0);
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    let cancelled = false;
    let timer;

    const poll = async () => {
      if (cancelled) return;
      attempts.current += 1;
      try {
        const { data } = await api.get(`/donate/status/${sessionId}`);
        setAmountCents(data.amount_cents || 0);
        if (data.payment_status === "paid") { setStatus("paid"); return; }
        if (data.status === "failed" || data.status === "expired") { setStatus("error"); return; }
      } catch {
        // ignore transient
      }
      if (attempts.current >= MAX_ATTEMPTS) { setStatus("timeout"); return; }
      timer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [sessionId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16" data-testid="donate-success-page">
      <div className="relative w-full max-w-md rounded-2xl border border-forge-border bg-forge-surface p-8 text-center overflow-hidden">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-forge-primary/20 blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-forge-tech/10 blur-3xl pointer-events-none"/>
        <div className="relative">
          {status === "polling" && (
            <>
              <Loader2 className="w-10 h-10 text-forge-primary mx-auto mb-4 animate-spin"/>
              <h1 className="font-display text-2xl text-forge-text mb-2">Confirming your contribution…</h1>
              <p className="text-forge-muted text-sm">Hold tight — Stripe is finalising the payment.</p>
            </>
          )}
          {status === "paid" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-forge-primary mx-auto mb-4"/>
              <h1 className="font-display text-2xl text-forge-text mb-2">Thanks — the printers thank you too.</h1>
              <p className="text-forge-muted text-sm mb-6">
                Your ${(amountCents / 100).toFixed(2)} tip just landed. Your name (if provided) is now live on the Supporter Wall.
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/#supporter-wall" data-testid="donate-success-wall">
                  <Button className="btn-forge w-full rounded-full">
                    <HandHeart className="w-4 h-4 mr-2"/> See the wall
                  </Button>
                </Link>
                <Link to="/" data-testid="donate-success-home">
                  <Button variant="outline" className="w-full rounded-full border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text">
                    Back home <ArrowRight className="w-4 h-4 ml-2"/>
                  </Button>
                </Link>
              </div>
            </>
          )}
          {status === "timeout" && (
            <>
              <Loader2 className="w-10 h-10 text-forge-muted mx-auto mb-4"/>
              <h1 className="font-display text-2xl text-forge-text mb-2">Almost there…</h1>
              <p className="text-forge-muted text-sm mb-6">
                Stripe is still confirming. Refresh in a moment or head back home — your tip will land shortly.
              </p>
              <Link to="/" data-testid="donate-timeout-home">
                <Button className="btn-forge w-full rounded-full">Back home</Button>
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4"/>
              <h1 className="font-display text-2xl text-forge-text mb-2">We couldn't confirm the payment.</h1>
              <p className="text-forge-muted text-sm mb-6">
                No charge is expected — try again or reach out via chat if the amount already shows on your statement.
              </p>
              <Link to="/" data-testid="donate-error-home">
                <Button className="btn-forge w-full rounded-full">Back home</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
