import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import DailyTradingPlan from "@/components/dashboard/DailyTradingPlan";
import MarketOverview from "@/components/dashboard/MarketOverview";

const Terminal = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, loading, navigate]);

  if (loading || !currentUser) return null;
  const isActive = userProfile?.subscriptionStatus === 'active';
  const isTraderOrElite = isActive && (userProfile?.plan === "trader" || userProfile?.plan === "elite");

  return (
    <div className="min-h-screen bg-background noise-overlay">
      <Navbar />
      <div className="pt-24 px-6 max-w-[1280px] mx-auto pb-12">
        
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-foreground">
            LIVE TERMINAL
          </h1>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground uppercase bg-panel border border-border px-2 py-1 rounded">
              Plan: {userProfile?.plan || 'Free'}
            </span>
            <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${isActive ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              Status: {isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>

        {isActive && (
          <div className="mb-6 border border-primary/30 bg-primary/5 rounded py-2 px-3 flex items-center gap-2 reveal-up shadow-sm">
            <motion.span 
              className="w-2 h-2 rounded-full bg-primary shrink-0" 
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="font-mono text-xs font-semibold text-primary uppercase tracking-widest">
              Suggested Action: Consider LONG position based on current risk model
            </span>
          </div>
        )}

        <MarketOverview />
        <DailyTradingPlan isLocked={!isTraderOrElite} />

        <DashboardGrid variant="real" isLocked={!isActive} />

      </div>
      <Footer />
    </div>
  );
};

export default Terminal;
