import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import DailyTradingPlan from "@/components/dashboard/DailyTradingPlan";

const SYSTEM_FEEDBACK_LINES = [
  "Scanning liquidity clusters...",
  "Monitoring volatility regimes...",
  "Recalibrating risk models...",
  "Analyzing order book depth..."
];

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

  // Session Timer Logic 
  const [minutesToUpdate, setMinutesToUpdate] = useState(14);
  const [secondsToUpdate, setSecondsToUpdate] = useState(59);
  const [feedbackIndex, setFeedbackIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsToUpdate(prev => {
        if (prev === 0) {
          setMinutesToUpdate(m => (m === 0 ? 14 : m - 1));
          return 59;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const feedbackTimer = setInterval(() => {
      setFeedbackIndex(prev => (prev + 1) % SYSTEM_FEEDBACK_LINES.length);
    }, 5000); // Rotate every 5 seconds
    return () => clearInterval(feedbackTimer);
  }, []);

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

        {/* Premium Command Center */}
        {isActive && (
          <div className="mb-6 rounded border border-primary/20 bg-panel-2/30 flex flex-col overflow-hidden reveal-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 border-b border-border/50 bg-primary/5 gap-3">
              <div className="flex items-center gap-2">
                <motion.span 
                  className="w-2 h-2 rounded-full bg-primary shrink-0" 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="font-mono text-xs font-semibold text-primary uppercase tracking-widest">
                  Suggested Action: Focus on long setups based on current model
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-panel border border-border/50 overflow-hidden w-[220px]">
                  <motion.span 
                    key={feedbackIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                  >
                    {SYSTEM_FEEDBACK_LINES[feedbackIndex]}
                  </motion.span>
                </div>
                
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-warning/10 border border-warning/20">
                  <span className="font-mono text-[9px] text-warning uppercase font-bold tracking-widest">
                    Next update in: {String(minutesToUpdate).padStart(2, '0')}:{String(secondsToUpdate).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Rebuilt Market Overview Row via inline rendering to ensure cohesive border grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/50">
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Market Status</span>
                  <span className="font-display font-bold text-[15px] text-foreground uppercase tracking-widest">Bullish</span>
                </div>
                <div className="w-8 h-8 rounded-full border border-green-500/20 flex items-center justify-center bg-green-500/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Active Signals</span>
                  <span className="font-display font-bold text-[15px] text-foreground tracking-widest">14 Nodes</span>
                </div>
                <div className="text-[10px] font-mono text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-widest">
                  Tracking
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Global Risk Mode</span>
                  <span className="font-display font-bold text-[15px] text-warning tracking-widest uppercase">Elevated</span>
                </div>
                <div className="w-8 h-8 rounded-full border border-warning/20 flex items-center justify-center bg-warning/5 text-warning">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        <DailyTradingPlan isLocked={!isTraderOrElite} />

        <DashboardGrid variant="real" isLocked={!isActive} />

      </div>
      <Footer />
    </div>
  );
};

export default Terminal;
