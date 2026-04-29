import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import Snow from "@/components/dashboard/Snow";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/terminal');
    } catch (err: any) {
      toast.error(err.message || "Google auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background noise-overlay relative z-0 flex flex-col">
      <Snow />
      <Navbar />
      
      {/* ── TERMINAL BACKGROUND (Empty) ── */}
      <div className="grid-bg relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        
        {/* ── AUTHENTICATION PANEL ── */}
        <div className="w-full max-w-md panel-glow p-8 sm:p-10 space-y-8 rounded border border-border/50 bg-panel/80 backdrop-blur-xl shadow-2xl relative z-20">
          
          <div className="text-center space-y-3">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground uppercase">
              Access Terminal
            </h1>
            <p className="text-xs font-mono text-muted-foreground/80 tracking-wide max-w-[260px] mx-auto">
              Authenticate to unlock live signals
            </p>
          </div>

          <div className="pt-2">
            <button 
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground font-mono text-xs font-bold uppercase tracking-widest rounded hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_20px_rgba(var(--primary-rgb,99,102,241),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb,99,102,241),0.4)]"
            >
              {loading ? (
                <span className="animate-pulse">AUTHENTICATING...</span>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" className="bg-white rounded-full p-[2px] shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                  CONTINUE WITH GOOGLE
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
