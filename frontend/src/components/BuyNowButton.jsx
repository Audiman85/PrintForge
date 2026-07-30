import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * "Pay now with Stripe" — one-tap Stripe Checkout for the print quote + shipping total.
 *
 * Props:
 *   product   — { product_id, title }
 *   quote     — object from /api/quote (needs total_price + quantity + line_subtotal etc.)
 *   shipping  — selected carrier object { carrier_code, carrier_name, price }
 *   config    — plain-object config (material, quality, nozzle_mm, colors, quantity, infill_pct)
 *   contactEmail — optional email prefill
 */
export default function BuyNowButton({ product, quote, shipping, config, contactEmail, className = "", compact = false, "data-testid": testId = "buy-now-btn" }) {
  const [busy, setBusy] = useState(false);
  const disabled = !product || !quote || busy;

  const submit = async () => {
    if (disabled) return;
    setBusy(true);
    try {
      const quoteCents = Math.round((quote?.total_price || 0) * 100);
      const shippingCents = Math.round((shipping?.price || 0) * 100);
      if (quoteCents <= 0) {
        toast.error("Waiting for a valid quote…");
        setBusy(false);
        return;
      }
      const { data } = await api.post("/orders/checkout", {
        product_id: product.product_id,
        quote_total_cents: quoteCents,
        shipping_price_cents: shippingCents,
        shipping_carrier_code: shipping?.carrier_code || null,
        shipping_country: shipping?.country || null,
        shipping_postal: shipping?.postal || null,
        config: config || {},
        origin_url: window.location.origin,
        contact_email: contactEmail || null,
      });
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error("Could not start checkout — try again.");
        setBusy(false);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Checkout failed");
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={submit}
      disabled={disabled}
      data-testid={testId}
      className={`btn-forge rounded-full ${compact ? "px-4 py-5 text-sm" : "py-6 text-base w-full"} ${className}`}
    >
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CreditCard className="w-4 h-4 mr-2"/>}
      {busy ? "Redirecting…" : compact ? "Pay now" : "Pay now with Stripe"}
    </Button>
  );
}
