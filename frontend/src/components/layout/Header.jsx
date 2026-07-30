import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Search, User, LogOut, Heart, Upload, Package, LayoutGrid, LogIn } from "lucide-react";
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

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? "text-forge-primary" : "text-forge-text/80 hover:text-forge-text"}`;

  return (
    <header className="sticky top-0 z-40 glass border-b border-forge-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-md bg-forge-primary flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-md animate-forge-pulse" />
            <span className="font-display font-bold text-forge-bg text-lg">P</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-semibold text-forge-text text-lg">PrintForge</span>
            <span className="font-mono text-[9px] tracking-[0.2em] text-forge-tech uppercase">3D · MARKETPLACE</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/" end className={linkCls} data-testid="nav-marketplace">{t("nav.marketplace")}</NavLink>
          <NavLink to="/search" className={linkCls} data-testid="nav-search">{t("nav.search")}</NavLink>
          <NavLink to="/community" className={linkCls} data-testid="nav-community">{t("nav.community")}</NavLink>
          <NavLink to="/print" className={linkCls} data-testid="nav-print">{t("nav.print")}</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher compact/>
          <Button
            variant="ghost" size="sm"
            className="text-forge-muted hover:text-forge-text"
            onClick={() => navigate("/search")}
            data-testid="header-search-btn"
          >
            <Search className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Search</span>
            <span className="hidden lg:inline ml-3 font-mono text-[10px] px-1.5 py-0.5 rounded border border-forge-border">⌘K</span>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-forge-elevated transition" data-testid="user-menu-trigger">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-forge-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-forge-elevated flex items-center justify-center"><User className="w-4 h-4"/></div>
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
                <DropdownMenuItem onClick={async () => { await logout(); navigate("/"); }} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2"/> {t("nav.signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button className="btn-forge rounded-full px-5" onClick={loginWithGoogle} data-testid="login-btn">
              <LogIn className="w-4 h-4 mr-2"/> {t("nav.signin")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
