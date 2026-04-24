import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export interface SignalCardProps {
  id?: string;
  asset: string;
  direction: "LONG" | "SHORT" | string;
  confidence: string;
  entryLow: number;
  entryHigh: number;
  tp: number;
  sl: number;
  leverage?: number;
  currentPrice?: number | null;  // live price (RUNNING only)
  exitPrice?: number;     // locked exit price (closed trades)
  finalReturn?: number;   // stored immutable return as a number
  status: 'RUNNING' | 'TP_HIT' | 'SL_HIT' | string;
  liveStatus?: string;
  expReturn?: string;     // formatted string from DashboardGrid
  timestamp?: any;
  validUntil?: any;
  isBlurred?: boolean;
}

const fmt = (val: number) => {
  if (val >= 1) {
    const rounded = parseFloat(val.toFixed(2));
    return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return parseFloat(val.toFixed(6)).toString();
};

const SignalCard = ({
  asset, direction, confidence, entryLow, entryHigh, tp, sl,
  leverage = 1, currentPrice, exitPrice, finalReturn: finalReturnNum,
  status, liveStatus, expReturn, validUntil, isBlurred
}: SignalCardProps) => {

  const isLong = direction === 'LONG' || direction === 'BUY';
  const finalStatus = liveStatus || status || 'RUNNING';

  // ── Risk:Reward ──────────────────────────────────────────────────────────
  const entryAvg = (entryLow + entryHigh) / 2;
  const riskReward = isLong
    ? Math.abs((tp - entryAvg) / (entryAvg - sl)).toFixed(1)
    : Math.abs((entryAvg - tp) / (sl - entryAvg)).toFixed(1);

  // ── Countdown ────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<string>("--h --m");

  useEffect(() => {
    if (!validUntil) return;
    const targetDate = validUntil?.toDate ? validUntil.toDate() : new Date(validUntil);
    const update = () => {
      const dist = targetDate.getTime() - Date.now();
      if (dist < 0) { setTimeLeft("Expired"); return; }
      const h = Math.floor(dist / 3_600_000);
      const m = Math.floor((dist % 3_600_000) / 60_000);
      setTimeLeft(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [validUntil]);

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  // Position of entry zone on the slider (as 0–100%)
  const entryLowPos  = clamp((entryLow  - sl) / (tp - sl || 1)) * 100;
  const entryHighPos = clamp((entryHigh - sl) / (tp - sl || 1)) * 100;

  // ── Closed vs Live state ─────────────────────────────────────────────────
  const isClosed = finalStatus === 'TP_HIT' || finalStatus === 'SL_HIT';

  // For closed trades: show exit price on slider (locked, no pointer animation)
  // For running trades: show live currentPrice pointer
  const displayPrice = isClosed ? (exitPrice ?? null) : (currentPrice === null ? null : (currentPrice ?? null));
  const priceLoaded  = displayPrice != null && displayPrice > 0;
  const isUnavailable = !isClosed && currentPrice === null;
  
  const rawPricePos = priceLoaded
    ? Math.max(0, Math.min(1, (displayPrice! - sl) / (tp - sl)))
    : null;
  const pricePct = rawPricePos != null ? rawPricePos * 100 : null;

  // ── Return value ────────────────────────────────────────────────────────
  // Prefer the pre-formatted string expReturn (passed by DashboardGrid).
  // Fall back to formatting finalReturnNum directly.
  const finalReturn = expReturn
    ?? (finalReturnNum != null ? (finalReturnNum >= 0 ? `+${finalReturnNum.toFixed(1)}%` : `${finalReturnNum.toFixed(1)}%`) : null);
  const returnPositive = finalReturn ? !finalReturn.startsWith("-") : null;

  // ── Status helpers ───────────────────────────────────────────────────────
  const statusConfig = {
    TP_HIT:  { dot: "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]",  label: "🟢 Target Achieved", color: "text-green-500" },
    SL_HIT:  { dot: "bg-destructive shadow-[0_0_5px_rgba(239,68,68,0.5)]", label: "🔴 Stopped Out",     color: "text-destructive" },
    RUNNING: { dot: "bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] animate-pulse", label: "⚪ Active Position", color: "text-foreground" },
  };
  const statusKey = finalStatus as keyof typeof statusConfig;
  const sc = statusConfig[statusKey] ?? statusConfig.RUNNING;

  const hoverFx = isLong ? "hover:border-green-500/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.08)]" : "hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.08)]";

  return (
    <motion.div
      className={`group panel-glow p-4 flex flex-col gap-3 rounded border border-border bg-panel text-[13px] font-mono transition-all duration-300 ${isBlurred ? "blur-[2px] opacity-40 select-none pointer-events-none" : `hover:bg-panel-2/30 ${hoverFx}`}`}
      whileHover={{ y: isBlurred ? 0 : -4, scale: isBlurred ? 1 : 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <style>
        {`
          @keyframes slide-shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-slide-shimmer {
            animation: slide-shimmer 4s infinite linear;
          }
        `}
      </style>
      {/* ── TOP LAYER: Asset/Direction/Leverage & Expected Return ── */}
      <div className="flex items-start justify-between border-b border-border/50 pb-3">
        <div className="flex flex-col gap-1.5">
          {/* Asset + Direction */}
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[22px] text-foreground leading-none tracking-tight">
              {asset}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${isLong ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
              {direction}
            </span>
          </div>
          {/* Confidence | R:R | Leverage */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">Conf</span>
            <span className="text-sm font-semibold text-foreground leading-none">{confidence}</span>
            <span className="text-muted-foreground/40 leading-none">|</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">R:R</span>
            <span className="text-sm font-semibold text-foreground leading-none">{`1:${riskReward}`}</span>
            <span className="text-muted-foreground/40 leading-none">|</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">Lev</span>
            <span className="text-sm font-semibold text-foreground leading-none">{leverage}x</span>
          </div>
        </div>

        {/* Expected/Final Return (Top Right) */}
        {finalReturn != null && (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 group-hover:brightness-125 group-hover:scale-[1.03] transition-all duration-300 origin-right">
              <span
                className={`text-[21px] font-bold tabular-nums leading-none tracking-[0.02em] ${
                  finalReturn === "—"
                    ? "text-muted-foreground/40"
                    : returnPositive
                    ? "text-green-400"
                    : "text-red-400"
                }`}
                style={{
                  textShadow:
                    finalReturn === "—"
                      ? "none"
                      : returnPositive
                      ? "0 0 12px rgba(74,222,128,0.55)"
                      : "0 0 12px rgba(248,113,113,0.55)",
                }}
              >
                {finalReturn}
              </span>
              {/* Lock icon for closed trades */}
              {isClosed && (
                <svg className="w-3 h-3 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </div>
            <span className="text-[9px] text-muted-foreground/70 uppercase tracking-widest font-bold leading-none">
              {isClosed ? 'Finalised' : 'Expected Profit'}
            </span>
          </div>
        )}
      </div>

      {/* ── MIDDLE: 3-COLUMN METRICS (SL | Entry | TP) ── */}
      <div className="flex items-end justify-center gap-5 py-3 mt-1">
        {/* Stop Loss (Left) */}
        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Stop Loss</span>
          <span className="text-[15px] text-red-500 font-bold leading-none tracking-tight">
            {`$${fmt(sl)}`}
          </span>
        </div>

        {/* Subtle Divider */}
        <div className="h-6 w-px bg-border/40 mb-0.5" />

        {/* Entry Zone (Center) */}
        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Entry</span>
          <span className="text-[14px] text-white font-bold leading-none tracking-tight">
            {entryLow === entryHigh ? `$${fmt(entryLow)}` : `$${fmt(entryLow)} — $${fmt(entryHigh)}`}
          </span>
        </div>

        {/* Subtle Divider */}
        <div className="h-6 w-px bg-border/40 mb-0.5" />

        {/* Take Profit (Right) */}
        <div className="flex flex-col gap-1.5 items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Take Profit</span>
          <span className="text-[15px] text-green-500 font-bold leading-none tracking-tight">
            {`$${fmt(tp)}`}
          </span>
        </div>
      </div>

      {/* ── SLIDER ── */}
      <div className="flex flex-col gap-1.5 mt-2 px-1">
        <div className={`relative h-1 rounded-full overflow-hidden flex items-center transition-opacity ${isUnavailable ? "opacity-40" : "opacity-100"}`} style={{ background: "var(--panel-2, #1a1a2e)" }}>
          {/* Left zone (SL text mapping) */}
          <div className="absolute h-full rounded-l-full bg-red-500/70" style={{ left: 0, right: `${100 - Math.min(entryLowPos, entryHighPos)}%` }} />
          
          {/* Entry zone */}
          <div className="absolute h-full bg-muted-foreground/40" style={{ left: `${Math.min(entryLowPos, entryHighPos)}%`, right: `${100 - Math.max(entryLowPos, entryHighPos)}%` }} />
          
          {/* Right zone (TP text mapping) */}
          <div className="absolute h-full rounded-r-full bg-green-500/70" style={{ left: `${Math.max(entryLowPos, entryHighPos)}%`, right: 0 }} />

          {/* Price tracker */}
          {pricePct != null && (
            <div className={`absolute w-[2px] h-2 rounded bg-white transition-all duration-700 ${isClosed ? 'opacity-50' : 'opacity-100'}`} style={{ left: `calc(${pricePct}% - 1px)` }} />
          )}
        </div>
      </div>

      {/* ── CURRENT PRICE ── */}
      <div className="text-[10px] text-muted-foreground mt-0.5 px-0.5 flex items-center">
        {isClosed ? (
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground/60">Exit Price:</span>
            {exitPrice != null ? (
              <span className="text-[13px] text-foreground font-bold tracking-tight">${fmt(exitPrice)}</span>
            ) : <span className="opacity-40">—</span>}
            <span className="ml-1 text-[7px] px-1 py-0.5 rounded border border-border/50 text-muted-foreground/50 uppercase tracking-widest font-bold">LOCKED</span>
          </span>
        ) : isUnavailable ? (
          <span className="flex items-center gap-1.5">Current Price: <span className="text-muted-foreground/60 font-medium">No market feed</span></span>
        ) : priceLoaded ? (
          <span className="flex items-center gap-1.5">
            <span>Current Price:</span> 
            <span className="text-[14px] text-foreground font-bold tabular-nums tracking-tight">${fmt(displayPrice!)}</span>
          </span>
        ) : (
          <span className="opacity-50 animate-pulse">Fetching price...</span>
        )}
      </div>

      {/* ── FOOTER: Status | Valid Timer ── */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          <span className={`text-[10px] uppercase tracking-widest font-bold ${sc.color}`}>
            {sc.label.replace(/^[^\s]+ /, "")}
          </span>
        </div>

        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase ${finalStatus === 'RUNNING' && timeLeft !== 'Expired' ? 'bg-warning/10 border border-warning/20 text-warning' : 'bg-panel-2 border border-border/50 text-muted-foreground opacity-60'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${finalStatus === 'RUNNING' && timeLeft !== 'Expired' ? 'bg-warning animate-pulse' : 'bg-muted-foreground'}`} />
          {timeLeft}
        </div>
      </div>
    </motion.div>
  );
};

export default SignalCard;
