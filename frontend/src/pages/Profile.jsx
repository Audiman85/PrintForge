import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import SocialsProfile from "@/components/SocialsProfile";
import { UserCircle2 } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16" data-testid="profile-page">
      <div className="flex items-center gap-3 mb-3">
        <div className="scanline w-12"/>
        <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-forge-tech">Account</span>
      </div>
      <div className="flex items-center gap-4 mb-8">
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-forge-border"/>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-forge-elevated border border-forge-border flex items-center justify-center">
            <UserCircle2 className="w-8 h-8 text-forge-muted"/>
          </div>
        )}
        <div>
          <h1 className="font-display font-semibold text-forge-text text-2xl sm:text-3xl leading-tight">{user.name || "My Profile"}</h1>
          <p className="text-forge-muted text-sm">{user.email}</p>
        </div>
      </div>
      <SocialsProfile user={user}/>
    </div>
  );
}
