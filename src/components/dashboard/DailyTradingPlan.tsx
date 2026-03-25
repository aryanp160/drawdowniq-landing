import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";

interface DailyTradingPlanProps {
  isLocked?: boolean;
}

const defaultPlan = {
  date: new Date().toISOString(),
  bias: "Bullish",
  supportLevels: ["$61,200", "$59,800"],
  resistanceLevels: ["$63,500", "$65,000"],
  watchlist: ["BTC", "SOL", "LINK"],
  riskMode: "Medium"
};

const DailyTradingPlan = ({ isLocked = false }: DailyTradingPlanProps) => {
  const [plan, setPlan] = useState<any>(defaultPlan);

  useEffect(() => {
    const q = query(collection(db, "dailyPlans"), orderBy("date", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setPlan(snapshot.docs[0].data());
      }
    });
    return () => unsubscribe();
  }, []);

  const getBiasColor = (bias: string) => {
    const b = bias.toLowerCase();
    if (b === "bullish" || b.includes("long")) return "text-green-500 bg-green-500/10 border-green-500/30";
    if (b === "bearish" || b.includes("short")) return "text-destructive bg-destructive/10 border-destructive/30";
    return "text-warning bg-warning/10 border-warning/30";
  };

  return (
    <div className="panel-glow p-4 flex flex-col gap-3 rounded border border-border bg-panel text-xs font-mono mb-4 relative overflow-hidden">
      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-[6px] flex flex-col items-center justify-center pointer-events-auto">
          <Link to="/pricing" className="px-5 py-2 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded font-semibold hover:brightness-110 transition-all shadow-xl shadow-primary/20 hover:-translate-y-0.5">
            UNLOCK TRADER PLAN
          </Link>
          <p className="text-[9px] font-mono text-muted-foreground mt-3 uppercase tracking-wider">Upgrade to access daily execution strategies</p>
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col gap-3 transition-all ${isLocked ? "opacity-30 pointer-events-none select-none blur-[2px]" : ""}`}>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 pb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm uppercase tracking-widest text-foreground">Daily Trading Plan</span>
            <span className="hidden sm:inline-block text-[8px] tracking-[0.1em] uppercase text-muted-foreground border border-border/50 bg-panel-2 px-1.5 py-0.5 rounded">
              Updated daily before market open
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {new Date(plan.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-1">
          {/* Market Bias */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Market Bias</span>
            <span className={`inline-flex items-center self-start px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getBiasColor(plan.bias)}`}>
              {plan.bias}
            </span>
          </div>

          {/* Risk Mode */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Risk Profile</span>
            <span className="text-[11px] font-semibold text-foreground uppercase">{plan.riskMode}</span>
          </div>

          {/* Key Levels */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Key Levels</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-green-500">Res: {plan.resistanceLevels?.join(" / ")}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Sup: {plan.supportLevels?.join(" / ")}</span>
            </div>
          </div>

          {/* Watchlist */}
          <div className="flex flex-col gap-1.5 lg:items-end lg:text-right">
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Watchlist</span>
            <div className="flex flex-wrap gap-1 lg:justify-end">
              {plan.watchlist?.map((asset: string, i: number) => (
                <span key={i} className="px-1.5 py-0.5 bg-panel-2 border border-border/50 text-[9px] font-semibold rounded text-foreground">
                  {asset}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DailyTradingPlan;
