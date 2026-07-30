import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const POLL_MS = 2000;
const MAX_ATTEMPTS = 12;

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("polling");
  const [order, setOrder] = useState(null);
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
        const { data } = await api.get(`/orders/status/${sessionId}`);
        setAmountCents(data.amount_cents || 0);
        setOrder(data.order || null);
        if (data.payment_status === "paid") { setStatus("paid"); return; }
        if (data.status === "failed" || data.status === "expired") { setStatus("error"); return; }
      } catch {}
      if (attempts.current >= MAX_ATTEMPTS) { setStatus("timeout"); return; }
      timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [sessionId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16" data-testid="order-success-page">
      <div className="relative w-full max-w-lg rounded-2xl border border-forge-border bg-forge-surface p-8 text-center overflow-hidden">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-forge-primary/20 blur-3xl pointer-events-none"/>
        <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-forge-tech/10 blur-3xl pointer-events-none"/>
        <div className="relative">
          {status === "polling" && (
            <>
              <Loader2 className="w-10 h-10 text-forge-primary mx-auto mb-4 animate-spin"/>
              <h1 className="font-display text-2xl text-forge-text mb-2">Confirming your order…</h1>
              <p className="text-forge-muted text-sm">Stripe is finalising the payment.</p>
            </>
          )}
          {status === "paid" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-forge-primary mx-auto mb-4"/>
              <h1 className="font-display text-2xl text-forge-text mb-2">Order confirmed.</h1>
              <p className="text-forge-muted text-sm mb-2">
                We'll start printing shortly and email you with tracking.
              </p>
              <p className="font-mono text-xs text-forge-tech mb-6">
                Total <span className="text-forge-primary text-base font-semibold">${(amountCents/100).toFixed(2)}</span>
                {order?.order_id && <> · Order <span className="text-forge-text">{order.order_id}</span></>}
              </p>
              <div className="flex flex-col gap-2">
                <Link to="/dashboard?tab=orders" data-testid="order-success-dashboard">
                  <Button className="btn-forge w-full rounded-full">
                    <Rocket className="w-4 h-4 mr-2"/> Track my orders
                  </Button>
                </Link>
                <Link to="/" data-testid="order-success-home">
                  <Button variant="outline" className="w-full rounded-full border-forge-border bg-transparent text-forge-text hover:bg-forge-elevated hover:text-forge-text">
                    Keep browsing <ArrowRight className="w-4 h-4 ml-2"/>
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
                Stripe is still confirming. You'll get an email once it lands.
              </p>
              <Link to="/" data-testid="order-timeout-home">
                <Button className="btn-forge w-full rounded-full">Back home</Button>
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4"/>
              <h1 className="font-display text-2xl text-forge-text mb-2">We couldn't confirm the order.</h1>
              <p className="text-forge-muted text-sm mb-6">
                No charge is expected — try again or reach us via chat.
              </p>
              <Link to="/" data-testid="order-error-home">
                <Button className="btn-forge w-full rounded-full">Back home</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
