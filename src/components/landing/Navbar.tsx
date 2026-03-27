import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Navbar = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (e: any) {
      toast.error("Failed to log out");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 h-14">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
            <span className="font-display font-bold text-xs text-primary-foreground">D</span>
          </div>
          <span className="font-display font-semibold text-sm tracking-tight text-foreground">
            DRAWDOWNIQ
          </span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-1 bg-panel rounded-lg border border-border px-1 py-1">
          <Link to="/terminal" className="px-4 py-1.5 text-xs font-mono tracking-widest text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] rounded">
            TERMINAL
          </Link>
          <Link to="/pricing" className="px-4 py-1.5 text-xs font-mono tracking-widest text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] rounded">
            PRICING
          </Link>
        </div>

        {/* Right CTA / Auth Status */}
        <div className="flex items-center gap-4">
          {!currentUser ? (
            <Link 
              to="/login"
              className="px-4 py-1.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded font-semibold hover:brightness-110 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95]"
            >
              UNLOCK LIVE SIGNALS
            </Link>
          ) : (
            <>
              {/* Plan Awareness */}
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                  Plan: <span className="text-foreground">{userProfile?.plan || 'Free'}</span>
                </span>
                <span className={`font-mono text-[9px] uppercase tracking-widest leading-none mt-1 ${userProfile?.subscriptionStatus === 'active' ? 'text-green-500' : 'text-destructive'}`}>
                  Status: {userProfile?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <Link 
                to="/terminal"
                className="hidden sm:block px-4 py-1.5 bg-secondary text-secondary-foreground font-mono text-xs tracking-widest rounded transition-all duration-200 hover:bg-secondary/80 border border-border"
              >
                GO TO TERMINAL
              </Link>
              
              <button 
                onClick={handleLogout}
                className="w-8 h-8 rounded bg-panel border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                title="Disconnect"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
