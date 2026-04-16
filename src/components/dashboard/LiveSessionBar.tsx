import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LiveSession {
  isActive: boolean;
  startTime?: any;
  note?: string;         
  sessionNote?: string; 
  updatedAt?: any;
}

export interface LiveCall {
  asset: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  entryLocked?: boolean; 
  sl?: number;
  tp?: number;
  leverage?: number;
  status: "ACTIVE" | "CLOSED";
  finalReturn?: number;
  exitPrice?: number;
  startTime?: any;
  closedAt?: any;
  updatedAt?: any;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.price ? parseFloat(json.price) : null;
  } catch {
    return null;
  }
}

function calcReturn(direction: string, entry: number, current: number, leverage: number = 1): number {
  const isLong = direction === "LONG" || direction === "BUY";
  if (isLong) return ((current - entry) / entry) * 100 * leverage;
  return ((entry - current) / entry) * 100 * leverage;
}

function fmtPrice(n: number): string {
  if (n >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100)    return n.toFixed(2);
  return n.toFixed(4);
}

function fmtDuration(startTs: any, endTs?: any): string {
  const start = startTs?.toDate ? startTs.toDate().getTime() : null;
  if (!start) return "—";
  const end = endTs?.toDate ? endTs.toDate().getTime() : Date.now();
  const diffMs = end - start;
  if (diffMs < 0) return "—";
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Component ──────────────────────────────────────────────────────────────

const LiveSessionBar = () => {
  const [session, setSession]     = useState<LiveSession | null>(null);
  const [liveCall, setLiveCall]   = useState<LiveCall | null>(null);
  const [loading, setLoading]     = useState(true);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [elapsed, setElapsed]     = useState("—");
  
  const priceIntervalRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Listen to Live Session
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "liveSession", "current"), (docSnap) => {
      if (!docSnap.exists()) {
        setSession(null);
      } else {
        setSession(docSnap.data() as LiveSession);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Listen to Live Call
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "liveCall", "current"), (docSnap) => {
      if (!docSnap.exists()) {
        setLiveCall(null);
      } else {
        setLiveCall(docSnap.data() as LiveCall);
      }
    });
    return () => unsub();
  }, []);

  // 3. Live Price Polling (3-5s interval)
  useEffect(() => {
    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
      priceIntervalRef.current = null;
    }

    if (liveCall?.status !== "ACTIVE" || !liveCall?.asset || !liveCall?.entryPrice) {
      setLivePrice(null);
      return;
    }

    const poll = async () => {
      const p = await fetchPrice(liveCall.asset);
      if (p != null) setLivePrice(p);
    };

    poll(); // immediate
    priceIntervalRef.current = setInterval(poll, 4_000); // every 4 seconds

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [liveCall?.status, liveCall?.asset, liveCall?.entryPrice]);

  // 4. Session Elapsed Time
  useEffect(() => {
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);

    if (!session?.isActive || !session?.startTime) {
      setElapsed("—");
      return;
    }

    const update = () => setElapsed(fmtDuration(session.startTime));
    update();
    elapsedIntervalRef.current = setInterval(update, 30_000);

    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [session?.isActive, session?.startTime]);

  if (loading) return null;

  const isActiveSession = session?.isActive === true;
  const note = session?.note || session?.sessionNote;

  const hasActiveCall = liveCall?.status === "ACTIVE";
  const hasClosedCall = liveCall?.status === "CLOSED" && liveCall?.finalReturn != null;

  const isLong = liveCall?.direction === "LONG" || liveCall?.direction === "BUY";
  const displayDirection = liveCall?.direction || "LONG";
  const leverageVal = liveCall?.leverage || 1;

  // Live P&L Calculation
  let liveReturn: number | null = null;
  // Calculate return only if entry is locked
  if (hasActiveCall && livePrice && liveCall.entryPrice && liveCall.entryLocked === true) {
    liveReturn = calcReturn(liveCall.direction, liveCall.entryPrice, livePrice, leverageVal);
  }
  
  const liveReturnPositive = liveReturn != null && liveReturn >= 0;
  const closedReturnPositive = liveCall?.finalReturn != null && liveCall.finalReturn >= 0;

  // Progress Bar calculation
  let progressPos = 0;
  if (hasActiveCall && liveCall!.sl && liveCall!.tp && livePrice) {
    progressPos = Math.max(0, Math.min(100, ((livePrice - liveCall!.sl) / (liveCall!.tp - liveCall!.sl)) * 100));
  }

  const startStr = session?.startTime?.toDate
    ? session.startTime.toDate().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isActiveSession ? "active" : "inactive"}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="mb-8 flex flex-col gap-4"
      >
        {/* ─── ACTIVE SESSION ──────────────────────────────────────────────── */}
        {isActiveSession ? (
          <div className="rounded border border-border/40 bg-panel shadow-2xl overflow-hidden flex flex-col">
            
            {/* Session Header Strip */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/25 bg-red-500/[0.04]">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-red-500">
                  LIVE SESSION ACTIVE
                </span>
                {startStr && (
                  <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest hidden sm:inline ml-2">
                    Since: {startStr} <span className="opacity-40 px-1">|</span> Duration: {elapsed}
                  </span>
                )}
              </div>
            </div>

            {/* Trade Data Area */}
            <div className="p-5 sm:p-6 flex flex-col gap-5">
              {hasActiveCall ? (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    {/* Left: Trade Specs (Asset, Dir, Entry, Current) */}
                    <div className="flex flex-col gap-4">
                      {/* BIG: Asset | Direction | Leverage */}
                      <div className="flex items-center gap-3">
                        <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-none">
                          {liveCall.asset}
                        </span>
                        <div className="flex flex-col gap-1.5 items-start mt-1">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold leading-none uppercase ${isLong ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {displayDirection}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold leading-none text-muted-foreground bg-panel-2 border border-border/50">
                            {leverageVal}x
                          </span>
                        </div>
                      </div>

                      {/* MID: Data row */}
                      <div className="flex flex-wrap items-center gap-8 font-mono text-[13px]">
                        <div className="flex items-center gap-2">
                          <span className="uppercase text-muted-foreground/50 tracking-widest text-[9px]">Entry</span>
                          <span className="text-foreground tracking-tight font-semibold">{fmtPrice(liveCall.entryPrice)}</span>
                        </div>
                        {livePrice && (
                          <div className="flex items-center gap-2">
                            <span className="uppercase text-muted-foreground/50 tracking-widest text-[9px]">Now</span>
                            <span className="text-foreground tracking-tight font-semibold">{fmtPrice(livePrice)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT SIDE (HERO): Live PnL */}
                    {liveReturn != null && (
                      <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                        <span className={`font-mono font-bold text-5xl sm:text-6xl tabular-nums leading-[0.8] tracking-tighter ${liveReturnPositive ? "text-green-400" : "text-red-400"}`}
                          style={{ textShadow: liveReturnPositive ? "0 0 32px rgba(74,222,128,0.3)" : "0 0 32px rgba(248,113,113,0.3)" }}>
                          {liveReturnPositive ? "+" : ""}{liveReturn.toFixed(2)}%
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] mt-2 font-bold">
                          Live PnL
                        </span>
                      </div>
                    )}
                  </div>

                  {/* PROGRESS BAR (REAL) */}
                  {liveCall!.sl && liveCall!.tp && livePrice && (
                    <div className="flex flex-col gap-1.5 pt-2">
                      <div className="flex justify-between font-mono text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em]">
                        <span>SL {fmtPrice(liveCall!.sl)}</span>
                        <span>TP {fmtPrice(liveCall!.tp)}</span>
                      </div>
                      <div className="h-1.5 bg-panel-2 rounded-full w-full relative overflow-hidden border border-border/25">
                         <div 
                           className={`absolute top-0 bottom-0 left-0 ${liveReturnPositive ? 'bg-green-500/20' : 'bg-red-500/20'} transition-all duration-700 ease-out`}
                           style={{ width: `${progressPos}%` }}
                         />
                         <div 
                           className={`absolute top-0 bottom-0 w-1 rounded-full ${liveReturnPositive ? 'bg-green-400' : 'bg-red-400'} transition-all duration-700 ease-out`}
                           style={{ left: `${progressPos}%`, transform: 'translateX(-50%)', boxShadow: liveReturnPositive ? "0 0 6px rgba(74,222,128,0.8)" : "0 0 6px rgba(248,113,113,0.8)" }}
                         />
                      </div>
                    </div>
                  )}

                  {/* CONTEXT LINE */}
                  {note && (
                    <div className="pt-4 border-t border-border/20 text-[11px] font-mono text-muted-foreground/80 italic mt-1">
                      {note}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 flex justify-center items-center">
                  <span className="font-mono text-xs text-muted-foreground/50 uppercase tracking-[0.2em] animate-pulse">
                    Waiting for trade setup...
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── NO ACTIVE SESSION ─────────────────────────────────────────── */
          <div className="flex flex-col px-4 py-3 opacity-60 gap-1 mt-2">
             <div className="flex items-center gap-3">
               <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
               <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em] font-semibold">
                 NO ACTIVE SESSION
               </span>
             </div>
             <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-widest pl-4">
               Next session will begin soon
             </span>
          </div>
        )}

        {/* ─── RESULT CARD (Closed call) ─────────────────────────────────── */}
        {hasClosedCall && (!isActiveSession || !hasActiveCall) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded bg-panel shadow-sm p-5 border border-border/30 border-l-4 ${closedReturnPositive ? 'border-l-green-500/70' : 'border-l-red-500/70'}`}
          >
            <div className="flex flex-col gap-4">
              <span className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-[0.2em] font-bold">
                LAST TRADE RESULT
              </span>
              
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-2xl tracking-tight text-foreground">{liveCall.asset}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded leading-none ${closedReturnPositive ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                      {displayDirection}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold bg-panel-2 border border-border/50 px-2 py-0.5 rounded leading-none">
                      {leverageVal}x
                    </span>
                  </div>
                  
                  <div className="font-mono text-[11px] text-muted-foreground mt-1 flex items-center gap-4 uppercase tracking-widest opacity-80">
                    {liveCall.entryPrice && liveCall.exitPrice ? (
                      <span>{fmtPrice(liveCall.entryPrice)} → {fmtPrice(liveCall.exitPrice)}</span>
                    ) : liveCall.entryPrice ? (
                      <span>Entry: {fmtPrice(liveCall.entryPrice)}</span>
                    ) : null}
                    
                    {liveCall.startTime && liveCall.closedAt && (
                      <>
                        <span className="text-border">|</span>
                        <span>Duration: {fmtDuration(liveCall.startTime, liveCall.closedAt)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span
                    className={`font-mono font-bold text-4xl sm:text-5xl tabular-nums tracking-tighter leading-[0.85] ${closedReturnPositive ? "text-green-400" : "text-red-400"}`}
                    style={{ textShadow: closedReturnPositive ? "0 0 24px rgba(74,222,128,0.35)" : "0 0 24px rgba(248,113,113,0.35)" }}
                  >
                    {closedReturnPositive ? "+" : ""}{liveCall.finalReturn!.toFixed(2)}%
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">
                    Result
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveSessionBar;
