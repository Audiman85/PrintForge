import SupporterWall from "@/components/SupporterWall";
import { HandHeart } from "lucide-react";

export default function Supporters({ onOpenDonate }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
      <div className="flex items-center gap-3 mb-3">
        <div className="scanline w-12"/>
        <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-forge-tech">Supporters</span>
      </div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display font-semibold text-forge-text text-3xl sm:text-4xl lg:text-5xl leading-tight">
            The people fuelling <span className="text-forge-primary">PrintForge</span>.
          </h1>
          <p className="text-forge-muted mt-3 max-w-2xl text-sm sm:text-base">
            Every tip pays for filament, packaging, and time in the print lab. Add your name to the wall — or drop by anonymously.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDonate}
          data-testid="supporters-donate"
          className="self-start btn-forge inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm"
        >
          <HandHeart className="w-4 h-4"/> Support PrintForge
        </button>
      </div>
      <SupporterWall onDonate={onOpenDonate} />
    </div>
  );
}
