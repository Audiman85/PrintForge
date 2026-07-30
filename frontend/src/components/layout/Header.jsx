import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Search, User, LogOut, Heart, Upload, Package, LayoutGrid, LogIn, MessageSquare, PackagePlus, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function loginWithGoogle() {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function Header({ onOpenContact, onOpenChat, onOpenDonate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? "text-forge-primary" : "text-forge-text/80 hover:text-forge-text"}`;

  return (
    <header className="sticky top-0 z-40 glass border-b border-forge-border">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-6">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-forge-primary flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-md animate-forge-pulse" />
            <span className="font-display font-bold text-forge-bg text-base sm:text-lg">P</span>
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-display font-semibold text-forge-text text-base sm:text-lg">PrintForge</span>
            <span className="font-mono text-[9px] tracking-[0.2em] text-forge-tech uppercase hidden sm:inline">3D · MARKETPLACE</span>
          </div>
        </Link>

        {/* Upload — visible on all breakpoints */}
        <Link to="/print" data-testid="header-upload-btn" className="shrink-0">
          <Button variant="outline" size="sm" className="rounded-full border-forge-tech/50 bg-forge-tech/10 text-forge-tech hover:bg-forge-tech/20 hover:text-forge-tech px-2.5 sm:px-4">
            <Upload className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">Upload</span>
          </Button>
        </Link>

        <nav className="hidden md:flex items-center gap-5 lg:gap-6">
          <NavLink to="/" end className={linkCls} data-testid="nav-marketplace">{t("nav.marketplace")}</NavLink>
          <NavLink to="/community" className={linkCls} data-testid="nav-community">{t("nav.community")}</NavLink>
          <button
            onClick={() => onOpenContact?.()}
            className="text-sm font-medium text-forge-text/80 hover:text-forge-text transition-colors"
            data-testid="nav-contact"
          >
            Contact
          </button>
        </nav>

        {/* Inline search — desktop */}
        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xs" data-testid="header-search-form">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none"/>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 3D models…"
              className="w-full bg-forge-elevated border border-forge-border rounded-full pl-9 pr-3 py-1.5 text-sm text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary transition"
              data-testid="header-search-input"
            />
          </div>
        </form>

        {/* Compact search — mobile only (grows to fill available space) */}
        <form onSubmit={submitSearch} className="flex md:hidden flex-1 min-w-0" data-testid="header-search-form-mobile">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-muted pointer-events-none"/>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-forge-elevated border border-forge-border rounded-full pl-8 pr-3 py-1.5 text-xs text-forge-text placeholder:text-forge-faint focus:outline-none focus:border-forge-primary"
              data-testid="header-search-input-mobile"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenDonate?.()}
            data-testid="donate-btn"
            title="Support PrintForge"
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border border-forge-primary/40 bg-forge-primary/10 text-forge-primary hover:bg-forge-primary hover:text-forge-bg transition text-xs font-mono uppercase tracking-widest"
          >
            <HandHeart className="w-3.5 h-3.5"/>
            <span className="hidden sm:inline">Donate</span>
          </button>
          <div className="hidden sm:block"><LanguageSwitcher compact/></div>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg hover:bg-forge-elevated transition" data-testid="user-menu-trigger">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-forge-border" />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-forge-elevated flex items-center justify-center"><User className="w-4 h-4"/></div>
                  )}
                  <span className="hidden sm:inline text-sm text-forge-text">{user.name?.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-forge-surface border-forge-border text-forge-text">
                <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="menu-dashboard">
                  <LayoutGrid className="w-4 h-4 mr-2"/> {t("nav.dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=wishlist")} data-testid="menu-wishlist">
                  <Heart className="w-4 h-4 mr-2"/> {t("nav.wishlist")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=designs")} data-testid="menu-designs">
                  <Upload className="w-4 h-4 mr-2"/> {t("nav.designs")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=orders")} data-testid="menu-orders">
                  <Package className="w-4 h-4 mr-2"/> {t("nav.orders")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/products")} data-testid="menu-admin">
                  <PackagePlus className="w-4 h-4 mr-2"/> Add / manage products
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenChat?.()} data-testid="menu-chat">
                  <MessageSquare className="w-4 h-4 mr-2"/> Live chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await logout(); navigate("/"); }} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2"/> {t("nav.signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button className="btn-forge rounded-full px-3 sm:px-5 text-xs sm:text-sm" onClick={loginWithGoogle} data-testid="login-btn">
              <LogIn className="w-4 h-4 sm:mr-2"/> <span className="hidden sm:inline">{t("nav.signin")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile tab strip — Home / Community / Contact only */}
      <div className="md:hidden border-t border-forge-border">
        <nav className="overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 px-3 py-1.5 min-w-max">
            {[
              { to: "/",          key: "marketplace" },
              { to: "/community", key: "community" },
            ].map(item => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-widest transition ${isActive ? "bg-forge-primary text-forge-bg" : "text-forge-muted hover:text-forge-text"}`
                }
                data-testid={`mnav-${item.key}`}
              >
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
            <button
              onClick={() => onOpenContact?.()}
              className="whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-widest text-forge-muted hover:text-forge-text transition"
              data-testid="mnav-contact"
            >
              Contact
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
