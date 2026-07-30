import { Link } from "react-router-dom";
import { HandHeart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DonateCancel() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16" data-testid="donate-cancel-page">
      <div className="w-full max-w-md rounded-2xl border border-forge-border bg-forge-surface p-8 text-center">
        <HandHeart className="w-10 h-10 text-forge-muted mx-auto mb-4"/>
        <h1 className="font-display text-2xl text-forge-text mb-2">No worries — nothing was charged.</h1>
        <p className="text-forge-muted text-sm mb-6">
          Come back any time. Even sharing the site with a friend helps keep the printers humming.
        </p>
        <Link to="/" data-testid="donate-cancel-home">
          <Button className="btn-forge w-full rounded-full">
            Back home <ArrowRight className="w-4 h-4 ml-2"/>
          </Button>
        </Link>
      </div>
    </div>
  );
}
