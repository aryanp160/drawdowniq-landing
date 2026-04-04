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
  if (val >= 10000) return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (val >= 1000)  return val.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (val >= 100)   return val.toFixed(2);
  return val.toFixed(4);
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

  return (
    <motion.div
      className={`panel-glow p-4 flex flex-col gap-3 rounded border border-border bg-panel text-[13px] font-mono transition-all ${isBlurred ? "blur-[5px] opacity-40 select-none pointer-events-none" : "hover:bg-panel-2/30"}`}
      whileHover={{ y: isBlurred ? 0 : -2 }}
    >
      {/* ── TOP ROW: Asset | Direction | Confidence | Leverage | Timer ── */}
      <div className="flex items-start justify-between border-b border-border/50 pb-2.5">
        <div className="flex flex-col gap-2">
          {/* Asset + Direction */}
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[22px] text-foreground leading-none tracking-tight">
              {isBlurred ? "***" : asset}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isLong ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
              {isBlurred ? "---" : direction}
            </span>
          </div>
          {/* Confidence | R:R | Leverage */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Conf</span>
            <span className="text-sm font-semibold text-foreground">{isBlurred ? "--" : confidence}</span>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">R:R</span>
            <span className="text-sm font-semibold text-foreground">{isBlurred ? "-.-" : `1:${riskReward}`}</span>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Lev</span>
            <span className="text-sm font-semibold text-foreground">{leverage}x</span>
          </div>
        </div>

        {/* Valid timer */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase ${finalStatus === 'RUNNING' && timeLeft !== 'Expired' ? 'bg-warning/10 border border-warning/20 text-warning' : 'bg-panel-2 border border-border/50 text-muted-foreground opacity-60'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${finalStatus === 'RUNNING' && timeLeft !== 'Expired' ? 'bg-warning animate-pulse' : 'bg-muted-foreground'}`} />
          {isBlurred ? "--h --m" : timeLeft}
        </div>
      </div>

      {/* ── MIDDLE: Entry Zone | TP | SL ── */}
      <div className="grid grid-cols-3 gap-3 py-0.5">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase leading-none mb-0.5">Entry Zone</span>
          <span className="text-xs text-foreground font-semibold leading-none">
            {isBlurred ? "-.--" : `$${fmt(entryLow)}`}
          </span>
          <span className="text-[10px] text-muted-foreground leading-none">
            {isBlurred ? "-.--" : `$${fmt(entryHigh)}`}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase leading-none mb-0.5">Take Profit</span>
          <span className="text-xs text-green-500 font-semibold leading-none">
            {isBlurred ? "-.--" : `$${fmt(tp)}`}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase leading-none mb-0.5">Stop Loss</span>
          <span className="text-xs text-destructive font-semibold leading-none">
            {isBlurred ? "-.--" : `$${fmt(sl)}`}
          </span>
        </div>
      </div>

      {/* ── PRICE DISPLAY ── */}
      <div className="text-[10px] text-muted-foreground">
        {isBlurred ? (
          <span>Price: —</span>
        ) : isClosed ? (
          // Closed trade — show locked exit price
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground/60">Exit Price:</span>
            {exitPrice != null ? (
              <span className="text-foreground font-semibold">${fmt(exitPrice)}</span>
            ) : (
              <span className="opacity-40">—</span>
            )}
            <span className="ml-1 text-[7px] px-1 py-0.5 rounded border border-border/50 text-muted-foreground/50 uppercase tracking-widest font-bold">LOCKED</span>
          </span>
        ) : isUnavailable ? (
          <span>
            Current Price:{" "}
            <span className="text-muted-foreground/60 font-medium">No market feed</span>
          </span>
        ) : priceLoaded ? (
          <span>
            Current Price:{" "}
            <span className="text-foreground font-semibold">${fmt(displayPrice!)}</span>
          </span>
        ) : (
          <span className="opacity-50 animate-pulse">Fetching price...</span>
        )}
      </div>

      {/* ── SLIDER: strictly SL ↔ TP ── */}
      {/* For all: left=SL(red) → entry(grey) → TP(green)=right */}
      <div className="flex flex-col gap-1.5">
        {/* Labels */}
        <div className="flex items-center justify-between text-[8px] text-muted-foreground uppercase leading-none">
          <span className="text-destructive/70">SL</span>
          <span className="text-primary/70">TP</span>
        </div>

        {/* Track */}
        <div className={`relative h-1.5 rounded-full overflow-visible flex items-center transition-opacity ${isUnavailable ? "opacity-40" : "opacity-100"}`} style={{ background: "var(--panel-2, #1a1a2e)" }}>
          {/* Left zone — SL side (red) */}
          <div
            className="absolute h-full rounded-l-full bg-destructive/50"
            style={{ left: 0, right: `${100 - Math.min(entryLowPos, entryHighPos)}%` }}
          />
          {/* Entry zone (neutral grey) */}
          <div
            className="absolute h-full bg-muted-foreground/50"
            style={{
              left: `${Math.min(entryLowPos, entryHighPos)}%`,
              right: `${100 - Math.max(entryLowPos, entryHighPos)}%`,
            }}
          />
          {/* Right zone — TP side (green) */}
          <div
            className="absolute h-full rounded-r-full bg-primary/50"
            style={{ left: `${Math.max(entryLowPos, entryHighPos)}%`, right: 0 }}
          />

          {/* Price pointer — animated for live, static (dimmed) for closed */}
          {!isBlurred && pricePct != null && (
            <div
              className={`absolute w-[3px] h-3 rounded shadow-sm shadow-black z-10 -translate-y-px ${isClosed ? 'bg-muted-foreground/60' : 'bg-foreground transition-all duration-700'}`}
              style={{ left: `calc(${pricePct}% - 1.5px)` }}
            />
          )}
        </div>
      </div>

      {/* ── FOOTER: Status | Expected Return ── */}
      <div className="flex items-center justify-between pt-2.5 mt-0.5 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          <span className={`text-[10px] uppercase tracking-widest font-bold ${sc.color}`}>
            {isBlurred ? "UNKNOWN" : sc.label.replace(/^[^\s]+ /, "")}
          </span>
        </div>

        {!isBlurred && finalReturn != null && (
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <span className={`text-xs font-bold ${finalReturn === "—" ? "text-muted-foreground/50" : (returnPositive ? "text-green-500" : "text-destructive")}`}>
                {finalReturn}
              </span>
              {/* Lock icon signals immutability on closed trades */}
              {isClosed && (
                <svg className="w-2.5 h-2.5 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </div>
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">
              {isClosed ? 'Finalised' : 'Expected'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SignalCard;
