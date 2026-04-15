import { useEffect, useRef, useState } from "react";
import { collection, query, limit, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LiveSession {
  isActive: boolean;
  startTime?: any;
  endTime?: any;
  asset?: string;
  direction?: "LONG" | "SHORT";
  entryPrice?: number;
  finalReturn?: number;
  sessionNote?: string;
  currentBias: "LONG" | "SHORT" | "NEUTRAL";
  updatedAt?: any;
}

interface LiveSessionBarProps {
  onBiasChange?: (bias: "LONG" | "SHORT" | "NEUTRAL" | null) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Binance spot price fetch — same pattern as DashboardGrid. */
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

/** Calculate live return % (no leverage assumed unless added). */
function calcReturn(direction: "LONG" | "SHORT", entry: number, current: number): number {
  if (direction === "LONG")  return ((current - entry) / entry) * 100;
  return ((entry - current) / entry) * 100;
}

/** Format elapsed time from a Firestore Timestamp to "1h 42m" or "23m". */
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

/** Format a price number cleanly. */
function fmtPrice(n: number): string {
  if (n >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100)    return n.toFixed(2);
  return n.toFixed(4);
}

// ── Component ──────────────────────────────────────────────────────────────

const LiveSessionBar = ({ onBiasChange }: LiveSessionBarProps) => {
  const [session, setSession]     = useState<LiveSession | null>(null);
  const [loading, setLoading]     = useState(true);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [elapsed, setElapsed]     = useState("—");
  const priceIntervalRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 1. Firestore snapshot ───────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "liveSession"),
      orderBy("updatedAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setSession(null);
        onBiasChange?.(null);
      } else {
        const data = snap.docs[0].data() as LiveSession;
        setSession(data);
        onBiasChange?.(data.isActive ? data.currentBias : null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── 2. Live price polling (only when session is active + has asset) ─────
  useEffect(() => {
    // Clear any existing interval first
    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
      priceIntervalRef.current = null;
    }

    const asset = session?.asset;
    if (!session?.isActive || !asset || !session?.entryPrice) {
      setLivePrice(null);
      return;
    }

    const poll = async () => {
      const p = await fetchPrice(asset);
      if (p != null) setLivePrice(p);
    };

    poll(); // immediate first fetch
    priceIntervalRef.current = setInterval(poll, 8_000); // then every 8s

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [session?.isActive, session?.asset, session?.entryPrice]);

  // ── 3. Elapsed timer (tick every 30s) ─────────────────────────────────
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

  // ── Derived values ─────────────────────────────────────────────────────
  if (loading) return null;

  const isActive    = session?.isActive === true;
  const bias        = session?.currentBias ?? "NEUTRAL";
  const hasTradeData = !!(session?.asset && session?.entryPrice && session?.direction);

  // Live return — only meaningful when we have a price
  const liveReturn =
    hasTradeData && livePrice && session?.entryPrice && session?.direction
      ? calcReturn(session.direction, session.entryPrice, livePrice)
      : null;

  const liveReturnPositive = liveReturn != null && liveReturn >= 0;

  // Last session result (inactive, but has finalReturn stored)
  const hasLastResult =
    !isActive &&
    session != null &&
    session.finalReturn != null &&
    session.asset &&
    session.direction;

  const finalReturnPositive = !!(session?.finalReturn && session.finalReturn >= 0);

  // Colour configs
  const biasConfig = {
    LONG:    { label: "LONG MODE",  dot: "bg-green-400", text: "text-green-400", ring: "border-green-500/20 bg-green-500/5" },
    SHORT:   { label: "SHORT MODE", dot: "bg-red-400",   text: "text-red-400",   ring: "border-red-500/20   bg-red-500/5"   },
    NEUTRAL: { label: "NEUTRAL",    dot: "bg-amber-400", text: "text-amber-400", ring: "border-amber-500/20 bg-amber-500/5" },
  }[bias] ?? { label: "NEUTRAL", dot: "bg-amber-400", text: "text-amber-400", ring: "border-amber-500/20 bg-amber-500/5" };

  const startStr = session?.startTime?.toDate
    ? session.startTime.toDate().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : null;

  // Duration for last session
  const lastDuration = hasLastResult
    ? fmtDuration(session!.startTime, session!.endTime)
    : null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isActive ? "active" : "inactive"}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="mb-4 flex flex-col gap-2"
      >
        {/* ─── ACTIVE SESSION ──────────────────────────────────────────────── */}
        {isActive ? (
          <div className="rounded border border-border/40 bg-panel overflow-hidden">

            {/* Header strip */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/25 bg-red-500/[0.04]">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-red-400">
                  Live Session Active
                </span>
                {startStr && (
                  <span className="font-mono text-[9px] text-muted-foreground/35 uppercase tracking-widest hidden sm:inline">
                    since {startStr} · {elapsed}
                  </span>
                )}
              </div>
              <span className="font-mono text-[9px] text-muted-foreground/35 uppercase tracking-widest hidden sm:inline">
                Monitoring market — follow real-time guidance
              </span>
            </div>

            {/* Content row: bias + trade data + note */}
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 px-4 py-3 items-start">

              {/* Left: Bias pill */}
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-muted-foreground/40 uppercase tracking-[0.18em] font-mono shrink-0">Bias</span>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[10px] font-bold uppercase tracking-widest ${biasConfig.ring} ${biasConfig.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${biasConfig.dot}`} />
                  {biasConfig.label}
                </div>
              </div>

              {/* Right: Trade stats + note */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:border-l sm:border-border/20 sm:pl-4">

                {/* Asset + direction */}
                {hasTradeData && (
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-muted-foreground/35 uppercase tracking-widest font-mono">Trade</span>
                    <span className="font-mono text-[11px] font-semibold text-foreground">{session!.asset}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      session!.direction === "LONG"
                        ? "text-green-400 border-green-500/20 bg-green-500/5"
                        : "text-red-400 border-red-500/20 bg-red-500/5"
                    }`}>
                      {session!.direction}
                    </span>
                  </div>
                )}

                {/* Entry price */}
                {session?.entryPrice && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-muted-foreground/35 uppercase tracking-widest font-mono">Entry</span>
                    <span className="font-mono text-[11px] text-foreground">{fmtPrice(session.entryPrice)}</span>
                  </div>
                )}

                {/* Live price */}
                {livePrice && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-muted-foreground/35 uppercase tracking-widest font-mono">Now</span>
                    <span className="font-mono text-[11px] text-foreground tabular-nums">{fmtPrice(livePrice)}</span>
                  </div>
                )}

                {/* Live return — the star of the show */}
                {liveReturn != null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-muted-foreground/35 uppercase tracking-widest font-mono">Live P&L</span>
                    <span
                      className={`font-mono font-bold text-[14px] tabular-nums leading-none ${
                        liveReturnPositive ? "text-green-400" : "text-red-400"
                      }`}
                      style={{
                        textShadow: liveReturnPositive
                          ? "0 0 10px rgba(74,222,128,0.5)"
                          : "0 0 10px rgba(248,113,113,0.5)",
                      }}
                    >
                      {liveReturnPositive ? "+" : ""}{liveReturn.toFixed(2)}%
                    </span>
                    <span className="text-[8px] text-muted-foreground/30 uppercase tracking-widest font-mono">LIVE</span>
                  </div>
                )}

                {/* Note */}
                {session?.sessionNote && (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <svg className="w-3 h-3 text-muted-foreground/25 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M15 17H9m6-4H9m10-4H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2z"/>
                    </svg>
                    <span className="font-mono text-[10px] text-muted-foreground/45 italic">{session.sessionNote}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        ) : (
          /* ─── NO ACTIVE SESSION ─────────────────────────────────────────── */
          <div className="rounded border border-border/25 bg-panel/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/20 shrink-0" />
                <span className="font-mono text-[11px] text-muted-foreground/45 uppercase tracking-[0.18em]">
                  No Active Session
                </span>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground/25 uppercase tracking-widest hidden sm:inline">
                Next live session will begin soon
              </span>
            </div>
          </div>
        )}

        {/* ─── LAST SESSION RESULT (always show when available) ────────────── */}
        {hasLastResult && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="rounded border border-border/25 bg-panel overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-panel-2/20">
              <span className="font-mono text-[8px] text-muted-foreground/40 uppercase tracking-[0.18em]">
                Last Session Result
              </span>
              {lastDuration && (
                <span className="font-mono text-[8px] text-muted-foreground/25 uppercase tracking-widest">
                  Duration: {lastDuration}
                </span>
              )}
            </div>

            {/* Result row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">

              {/* Asset + direction */}
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[13px] text-foreground">{session!.asset}</span>
                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                  session!.direction === "LONG"
                    ? "text-green-400 border-green-500/20 bg-green-500/5"
                    : "text-red-400 border-red-500/20 bg-red-500/5"
                }`}>
                  {session!.direction}
                </span>
              </div>

              {/* Divider */}
              <span className="text-border/40 hidden sm:inline">·</span>

              {/* Final return */}
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-muted-foreground/35 uppercase tracking-widest font-mono">Result</span>
                <span
                  className={`font-mono font-bold text-[15px] tabular-nums leading-none ${
                    finalReturnPositive ? "text-green-400" : "text-red-400"
                  }`}
                  style={{
                    textShadow: finalReturnPositive
                      ? "0 0 8px rgba(74,222,128,0.45)"
                      : "0 0 8px rgba(248,113,113,0.45)",
                  }}
                >
                  {finalReturnPositive ? "+" : ""}{session!.finalReturn!.toFixed(2)}%
                </span>
              </div>

              {/* Entry price if stored */}
              {session?.entryPrice && (
                <>
                  <span className="text-border/40 hidden sm:inline">·</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-muted-foreground/35 uppercase tracking-widest font-mono">Entry</span>
                    <span className="font-mono text-[11px] text-muted-foreground/50">{fmtPrice(session.entryPrice)}</span>
                  </div>
                </>
              )}

              {/* Session end time */}
              {session?.endTime?.toDate && (
                <>
                  <span className="text-border/40 hidden sm:inline">·</span>
                  <span className="font-mono text-[9px] text-muted-foreground/30 uppercase tracking-widest">
                    Closed {session.endTime.toDate().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveSessionBar;
