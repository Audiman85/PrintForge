import { Link } from "react-router-dom";

export default function Footer({ onOpenContact }) {
  return (
    <footer className="border-t border-forge-border mt-24 bg-forge-bg" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-forge-primary flex items-center justify-center font-display font-bold text-forge-bg">P</div>
            <span className="font-display font-semibold text-forge-text">PrintForge</span>
          </div>
          <p className="text-sm text-forge-muted max-w-xs">A workbench for the maker era — discover, print, and share 3D creations from every corner of the web.</p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest text-forge-tech font-mono mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-forge-muted">
            <li><Link to="/" className="hover:text-forge-text">Marketplace</Link></li>
            <li><Link to="/search" className="hover:text-forge-text">Aggregated Search</Link></li>
            <li><Link to="/community" className="hover:text-forge-text">Community Designs</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest text-forge-tech font-mono mb-3">Services</h4>
          <ul className="space-y-2 text-sm text-forge-muted">
            <li><Link to="/print" className="hover:text-forge-text">Send Files To Print</Link></li>
            <li><Link to="/dashboard" className="hover:text-forge-text">Your Dashboard</Link></li>
            <li><button onClick={() => onOpenContact?.()} className="hover:text-forge-text text-left" data-testid="footer-contact-btn">Contact Us</button></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest text-forge-tech font-mono mb-3">Formats</h4>
          <div className="flex flex-wrap gap-2">
            <span className="chip">STL</span><span className="chip">OBJ</span><span className="chip">3MF</span><span className="chip">STEP</span>
          </div>
        </div>
      </div>
      <div className="border-t border-forge-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-forge-faint font-mono">© {new Date().getFullYear()} PrintForge · All extrusions reserved</p>
          <p className="text-xs text-forge-faint font-mono">Made for makers · v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
