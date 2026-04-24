import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import LiveSessionBar from "@/components/dashboard/LiveSessionBar";
import Snow from "@/components/dashboard/Snow";

// ── helpers ────────────────────────────────────────────────────────────────

function isTradeExpired(validUntil: any): boolean {
  if (!validUntil) return false;
  const t = validUntil?.toDate ? validUntil.toDate().getTime() : new Date(validUntil).getTime();
  return Date.now() > t;
}

/** Neutral when neither direction exceeds 60 % of running signals. */
function deriveBias(signals: any[]): "Bullish" | "Bearish" | "Neutral" {
  const running = signals.filter(s => s.status === "RUNNING" && !isTradeExpired(s.validUntil));
  if (running.length === 0) return "Neutral";
  const longs  = running.filter(s => s.direction === "LONG"  || s.direction === "BUY").length;
  const shorts = running.filter(s => s.direction === "SHORT" || s.direction === "SELL").length;
  const total  = longs + shorts;
  const longPct = total > 0 ? longs / total : 0.5;
  if (longPct > 0.60) return "Bullish";
  if (longPct < 0.40) return "Bearish";
  return "Neutral";
}

/** Avg leverage of running signals → volatility tier. */
function deriveVolatility(signals: any[]): "Low Volatility" | "Moderate Volatility" | "High Volatility" {
  const running = signals.filter(s => s.status === "RUNNING" && !isTradeExpired(s.validUntil));
  if (running.length === 0) return "Moderate Volatility";
  const avgLev = running.reduce((sum, s) => sum + (Number(s.leverage) || 1), 0) / running.length;
  if (avgLev < 5)  return "Low Volatility";
  if (avgLev < 12) return "Moderate Volatility";
  return "High Volatility";
}

function suggestedAction(bias: "Bullish" | "Bearish" | "Neutral"): string {
  if (bias === "Bullish") return "Market bias: Bullish — favour long setups in high-confidence entry zones";
  if (bias === "Bearish") return "Market bias: Bearish — prioritise short opportunities; manage position size";
  return "Market range-bound — remain selective; wait for high-confidence setups";
}

function contextLine(bias: "Bullish" | "Bearish" | "Neutral", vol: string, count: number): string {
  if (count === 0) return "No active signals at this time. New setups will appear when conditions align.";
  const dir  = bias === "Bullish" ? "bullish" : bias === "Bearish" ? "bearish" : "mixed";
  return `${count} active signal${count !== 1 ? "s" : ""} currently aligned with ${dir} momentum and ${vol.toLowerCase()}.`;
}

// ── component ──────────────────────────────────────────────────────────────

const Terminal = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) navigate("/login");
  }, [currentUser, loading, navigate]);

  if (loading || !currentUser) return null;

  const isActive        = userProfile?.subscriptionStatus === "active";
  const isTraderOrElite = isActive && (userProfile?.plan === "trader" || userProfile?.plan === "elite");



  // Live signals for Command Center stats
  const [signals, setSignals] = useState<any[]>([]);
  useEffect(() => {
    const q = query(collection(db, "signals"), orderBy("timestamp", "desc"), limit(60));
    return onSnapshot(q, snap => setSignals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const bias        = deriveBias(signals);
  const activeCount = signals.filter(s => s.status === "RUNNING" && !isTradeExpired(s.validUntil)).length;
  const volatility  = deriveVolatility(signals);
  const longCount   = signals.filter(s => s.status === "RUNNING" && !isTradeExpired(s.validUntil) && (s.direction === "LONG"  || s.direction === "BUY")).length;
  const shortCount  = signals.filter(s => s.status === "RUNNING" && !isTradeExpired(s.validUntil) && (s.direction === "SHORT" || s.direction === "SELL")).length;

  const biasText  = bias === "Bullish" ? "text-green-400"  : bias === "Bearish" ? "text-red-400"  : "text-warning";
  const biasDot   = bias === "Bullish" ? "bg-green-400"    : bias === "Bearish" ? "bg-red-400"    : "bg-warning";
  const biasRing  = bias === "Bullish" ? "border-green-500/15 bg-green-500/5" : bias === "Bearish" ? "border-red-500/15 bg-red-500/5" : "border-warning/15 bg-warning/5";
  const volText   = volatility === "Low Volatility" ? "text-green-400" : volatility === "High Volatility" ? "text-red-400" : "text-warning";

  // Model-refresh countdown to next 00:00 UTC
  const [mins, setMins] = useState(0);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => {
      const now  = new Date();
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = Math.max(0, next.getTime() - Date.now());
      setMins(Math.floor(diff / 60_000) % 60);
      setSecs(Math.floor((diff % 60_000) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background noise-overlay relative z-0">
      <Snow />
      <Navbar />
      {/* Grid canvas — same as landing page */}
      <div className="grid-bg relative z-10">
        <div className="pt-24 px-6 max-w-[1280px] mx-auto pb-12">

        {/* Page title */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-foreground">
            LIVE TERMINAL
          </h1>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground uppercase bg-panel border border-border px-2 py-1 rounded">
              Plan: {userProfile?.plan || "Free"}
            </span>
            <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${isActive ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
              Status: {isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </div>

        {/* ── Command Center ── */}
        {isActive && (
          <div className="mb-6 rounded border border-border/35 bg-panel overflow-hidden reveal-up">

            {/* Suggested action bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-2.5 border-b border-border/25 bg-panel-2/15 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${biasDot}`} />
                <span className="font-mono text-[11px] text-muted-foreground/75 tracking-wide truncate">
                  {suggestedAction(bias)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[9px] text-muted-foreground/30 uppercase tracking-widest hidden sm:inline">
                  Data synced with latest signals
                </span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-border/30 bg-panel">
                  <svg className="w-2.5 h-2.5 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  <span className="font-mono text-[9px] text-muted-foreground/40 uppercase tracking-widest">
                    Model refresh in: {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            {/* Three stat panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/25">

              {/* Market Bias */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] text-muted-foreground/45 uppercase tracking-[0.18em] font-mono">Market Bias</span>
                  <span className={`font-display font-bold text-[15px] uppercase tracking-widest ${biasText}`}>
                    {bias}
                  </span>
                  <span className="text-[8px] text-muted-foreground/30 font-mono">
                    {longCount}L · {shortCount}S
                  </span>
                </div>
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${biasRing}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${biasDot}`} />
                </div>
              </div>

              {/* Active Signals */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] text-muted-foreground/45 uppercase tracking-[0.18em] font-mono">Active Signals</span>
                  <span className="font-display font-bold text-[15px] text-foreground tracking-widest">
                    {activeCount}
                  </span>
                  <span className="text-[8px] text-muted-foreground/30 font-mono">currently running</span>
                </div>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${activeCount > 0 ? "text-primary/70 border-primary/15 bg-primary/5" : "text-muted-foreground/25 border-border/25"}`}>
                  {activeCount > 0 ? "Live" : "Idle"}
                </span>
              </div>

              {/* Volatility */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] text-muted-foreground/45 uppercase tracking-[0.18em] font-mono">Volatility Profile</span>
                  <span className={`font-display font-bold text-[15px] uppercase tracking-widest ${volText}`}>
                    {volatility}
                  </span>
                  <span className="text-[8px] text-muted-foreground/30 font-mono">derived from active leverage</span>
                </div>
                <svg className={`w-4 h-4 ${volText} opacity-40`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
            </div>

            {/* Context summary */}
            <div className="px-4 py-2 border-t border-border/20 bg-panel-2/10">
              <p className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
                {contextLine(bias, volatility, activeCount)}
              </p>
            </div>
          </div>
        )}

        {isTraderOrElite && <LiveSessionBar />}
        <DashboardGrid variant="real" isLocked={!isActive} />

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Terminal;
