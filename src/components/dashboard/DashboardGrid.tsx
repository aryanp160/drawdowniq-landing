import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";
import SignalCard from "./SignalCard";

interface DashboardGridProps {
  variant?: "preview" | "real";
  className?: string;
  isLocked?: boolean;
}



/** Compute finalReturn % value (not formatted string) for a closed trade. */
function calcFinalReturn(
  direction: string,
  entryPrice: number,
  exitPrice: number,
  leverage: number
): number {
  const isLong = direction === "LONG" || direction === "BUY";
  return isLong
    ? ((exitPrice - entryPrice) / entryPrice) * 100 * leverage
    : ((entryPrice - exitPrice) / entryPrice) * 100 * leverage;
}

/** Format a numeric return to signed-string like "+21.0%" or "-1.6%" */
function fmtReturn(pct: number): string {
  return pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
}

/** True when a RUNNING trade's validUntil has passed. Always uses live Date.now(). */
function isTradeExpired(validUntil: any): boolean {
  if (!validUntil) return false;
  const t = validUntil?.toDate ? validUntil.toDate().getTime() : new Date(validUntil).getTime();
  return Date.now() > t;
}

const DashboardGrid = ({ variant = "preview", className = "", isLocked = false }: DashboardGridProps) => {
  const [trades, setTrades] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [isClosedTradesOpen, setIsClosedTradesOpen] = useState(false);
  // How many Execution Log rows to show — starts at 10, user can load more
  const [visibleCount, setVisibleCount] = useState(10);

  // Search + filter state
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "running">("all");
  const [filterDir, setFilterDir] = useState<"all" | "LONG" | "SHORT">("all");
  const [filterLev, setFilterLev] = useState<"all" | "low" | "mid" | "high">("all");

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Forces processedTrades to re-evaluate expiry every 60 s even when no
  // price or trade update arrives.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Track which trade IDs we've already written a close to Firestore for,
  // so we never double-write within a single browser session.
  const closedRef = useRef<Set<string>>(new Set());

  // ── 1. Firestore snapshot ────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "signals"), orderBy("timestamp", "desc"), limit(60));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          asset: d.asset,
          direction: d.direction,
          confidence: d.confidence,
          entryLow: Number(d.entryLow),
          entryHigh: Number(d.entryHigh),
          tp: Number(d.tp),
          sl: Number(d.sl),
          leverage: Number(d.leverage || 1),
          status: d.status || "RUNNING",
          validUntil: d.validUntil,
          timestamp: d.timestamp,
          closedAt: d.closedAt ?? null,
          // Stored immutable fields — present only once trade is closed
          exitPrice: d.exitPrice != null ? Number(d.exitPrice) : null,
          finalReturn: d.finalReturn != null ? Number(d.finalReturn) : null,
        };
      });
      setTrades(fetched);
    });
    return () => unsubscribe();
  }, []);

  // ── 2. Live prices — only for RUNNING trades ────────────────────
  useEffect(() => {
    const runningAssets = Array.from(
      new Set(
        trades
          .filter(t => t.status === "RUNNING" && !isTradeExpired(t.validUntil))
          .map(t => t.asset)
          .filter(Boolean)
      )
    ) as string[];

    if (runningAssets.length === 0) return;

    const fetchPrices = async () => {
      const results = await Promise.allSettled(
        runningAssets.map(async (asset) => {
          try {
            const fetchSymbol = asset.toUpperCase().endsWith("USDT") ? asset.toUpperCase() : `${asset.toUpperCase()}USDT`;
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${fetchSymbol}`);
            if (res.ok) {
              const json = await res.json();
              return { asset, price: parseFloat(json.price), available: true };
            }
          } catch (e) {
            console.warn(`Binance fetch failed for ${asset}:`, e);
          }

          // Failed to fetch or asset unavailable
          return { asset, price: 0, available: false };
        })
      );

      const newPrices: Record<string, number | null> = {};
      results.forEach(r => {
        if (r.status === "fulfilled") {
          if (r.value.available && !isNaN(r.value.price)) {
            newPrices[r.value.asset] = r.value.price;
          } else {
            newPrices[r.value.asset] = null;
          }
        }
      });
      // Merge — old prices stay until replaced; closed-trade assets are never fetched
      setPrices(prev => ({ ...prev, ...newPrices }));
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 3_000);
    return () => clearInterval(interval);
  }, [trades]);

  // ── 3. Close-out writer — fires once per trade transition ─────────────────
  // When a RUNNING trade's live price crosses TP or SL, lock it in Firestore.
  useEffect(() => {
    trades.forEach(trade => {
      if (trade.status !== "RUNNING") return;         // already closed in DB
      if (closedRef.current.has(trade.id)) return;    // already written this session
      if (isTradeExpired(trade.validUntil)) return;    // signal window closed — do not auto-close

      const currentPrice = prices[trade.asset];
      if (!currentPrice) return;

      const isLong = trade.direction === "LONG" || trade.direction === "BUY";
      let newStatus: "TP_HIT" | "SL_HIT" | null = null;

      if (isLong) {
        if (currentPrice >= trade.tp) newStatus = "TP_HIT";
        else if (currentPrice <= trade.sl) newStatus = "SL_HIT";
      } else {
        if (currentPrice <= trade.tp) newStatus = "TP_HIT";
        else if (currentPrice >= trade.sl) newStatus = "SL_HIT";
      }

      if (!newStatus) return;

      // Determine exit price: exactly TP or SL (not currentPrice, to avoid
      // overshoot artifacts on slow polls).
      const exitPrice = newStatus === "TP_HIT" ? trade.tp : trade.sl;
      const entryPrice = (trade.entryLow + trade.entryHigh) / 2;
      const finalReturn = calcFinalReturn(trade.direction, entryPrice, exitPrice, trade.leverage);

      // Guard: mark immediately so re-renders don't trigger duplicate writes
      closedRef.current.add(trade.id);

      updateDoc(doc(db, "signals", trade.id), {
        status: newStatus,
        exitPrice,
        finalReturn,
        closedAt: serverTimestamp(),
      }).catch(err => {
        // Roll back guard if write failed so it can retry next cycle
        closedRef.current.delete(trade.id);
        console.error("Failed to close trade in Firestore:", err);
      });
    });
  }, [prices, trades]);

  // ── 4. Build display-ready trade objects ──────────────────────────────────
  const processedTrades = trades.map(trade => {
    const isClosed = trade.status === "TP_HIT" || trade.status === "SL_HIT";

    if (isClosed) {
      // ✅ Immutable path — use only stored Firestore values
      const storedReturn = trade.finalReturn != null ? fmtReturn(trade.finalReturn) : null;
      return {
        ...trade,
        liveStatus: trade.status,
        expReturn: storedReturn,
        currentPrice: trade.exitPrice,   // show exit price on the card, not live
      };
    }

    // 🕐 Expired path — validUntil passed; show in Execution Log with no return
    if (isTradeExpired(trade.validUntil)) {
      return { ...trade, liveStatus: "EXPIRED", expReturn: null, currentPrice: null };
    }

    // 🔄 Live path — RUNNING trade
    const currentPrice = prices[trade.asset];
    const isLong = trade.direction === "LONG" || trade.direction === "BUY";
    const leverage = trade.leverage || 1;
    let expReturn: string | null = null;

    if (currentPrice) {
      const pct = isLong
        ? ((trade.tp - currentPrice) / currentPrice) * leverage * 100
        : ((currentPrice - trade.tp) / currentPrice) * leverage * 100;
      expReturn = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
    } else {
      expReturn = "—";
    }

    return { ...trade, liveStatus: "RUNNING", expReturn, currentPrice };
  });

  const activeTrades = processedTrades.filter(t => t.liveStatus === "RUNNING");
  const previousTrades = processedTrades.filter(t => t.liveStatus !== "RUNNING");

  // ── Memoized filtered active trades ──────────────────────────────────────
  const filteredTrades = useMemo(() => {
    return activeTrades.filter(t => {
      // Search
      if (search.trim() && !t.asset?.toLowerCase().includes(search.trim().toLowerCase())) return false;
      // Direction
      if (filterDir !== "all" && t.direction !== filterDir) return false;
      // Leverage
      if (filterLev === "low" && t.leverage >= 5) return false;
      if (filterLev === "mid" && (t.leverage < 5 || t.leverage > 10)) return false;
      if (filterLev === "high" && t.leverage <= 10) return false;
      return true;
    });
  }, [activeTrades, search, filterDir, filterLev]);

  const hasActiveFilters = search.trim() || filterDir !== "all" || filterLev !== "all";
  const activeFilterCount = [filterDir !== "all", filterLev !== "all"].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className={`relative ${className}`}
    >
      {/* ── Search + Filter toolbar ── */}
      {!isLocked && (
        <div className="flex items-center gap-2 mb-5">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              id="signal-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assets (BTC, SOL, ETH...)"
              className="w-full bg-panel border border-border rounded pl-8 pr-3 py-2 text-[12px] font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:shadow-[0_0_0_1px_rgba(var(--primary-rgb,99,102,241),0.2)] transition-all"
            />
          </div>

          {/* Filter button + dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              id="signal-filter-btn"
              onClick={() => setFilterOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded border text-[11px] font-mono font-bold uppercase tracking-widest transition-all ${filterOpen || activeFilterCount > 0
                  ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_8px_rgba(99,102,241,0.15)]"
                  : "border-border bg-panel text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M3 6h18M7 12h10M11 18h2" />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 bg-panel border border-border rounded shadow-xl shadow-black/40 p-3 flex flex-col gap-3">
                {/* Direction */}
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1.5">Direction</p>
                  <div className="flex gap-1">
                    {(["all", "LONG", "SHORT"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setFilterDir(v)}
                        className={`flex-1 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-widest border transition-all ${filterDir === v
                            ? v === "LONG" ? "border-primary/60 bg-primary/10 text-primary" : v === "SHORT" ? "border-destructive/60 bg-destructive/10 text-destructive" : "border-border bg-panel-2 text-foreground"
                            : "border-border/50 bg-transparent text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {v === "all" ? "All" : v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leverage */}
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1.5">Leverage</p>
                  <div className="flex flex-col gap-1">
                    {([
                      { val: "all", label: "All" },
                      { val: "low", label: "Low  (<5x)" },
                      { val: "mid", label: "Med  (5–10x)" },
                      { val: "high", label: "High (>10x)" },
                    ] as const).map(({ val, label }) => (
                      <button
                        key={val}
                        onClick={() => setFilterLev(val)}
                        className={`text-left px-2 py-1 rounded text-[10px] font-mono border transition-all ${filterLev === val
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-panel-2/50"
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset */}
                {(filterDir !== "all" || filterLev !== "all") && (
                  <button
                    onClick={() => { setFilterDir("all"); setFilterLev("all"); }}
                    className="text-[9px] font-mono text-muted-foreground/60 hover:text-muted-foreground uppercase tracking-widest text-center pt-1 border-t border-border/40"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Signal grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 lg:auto-rows-fr">
        {(isLocked ? filteredTrades.slice(0, 3) : filteredTrades).map((trade, i) => {
          const blurred = isLocked && i === 2;
          return (
            <SignalCard
              key={trade.id}
              {...trade}
              currentPrice={prices[trade.asset]}
              isBlurred={blurred}
            />
          );
        })}
      </div>

      {/* ── Empty state (filters active, no results) ── */}
      {filteredTrades.length === 0 && activeTrades.length > 0 && hasActiveFilters && (
        <div className="flex flex-col items-center justify-center py-16 opacity-40">
          <svg className="w-8 h-8 text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M3 6h18M7 12h10M11 18h2" />
          </svg>
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">No signals match current filters</p>
        </div>
      )}

      {!isLocked && previousTrades.length > 0 && (
        <div className="mt-8 border-t border-border/50 pt-6 reveal-up">
          {(() => {
            const allCount = previousTrades.length;
            const winningTrades = previousTrades.filter(t => t.liveStatus === "TP_HIT").length;
            const losingTrades = previousTrades.filter(t => t.liveStatus === "SL_HIT").length;
            const closedCount = winningTrades + losingTrades;
            const winRate = closedCount > 0 ? Math.round((winningTrades / closedCount) * 100) : 0;

            // All-time total return — every closed trade
            const validReturns = previousTrades
              .filter(t => t.liveStatus === "TP_HIT" || t.liveStatus === "SL_HIT")
              .map(t => t.finalReturn)
              .filter((n): n is number => typeof n === "number" && !isNaN(n));
            const totalReturn = validReturns.reduce((a, b) => a + b, 0).toFixed(1);

            // Limit to 5 for landing page/locked, otherwise use visibleCount
            const effectiveVisibleCount = isLocked ? 5 : visibleCount;
            const visibleTrades = previousTrades.slice(0, effectiveVisibleCount);
            const hasMore = !isLocked && previousTrades.length > visibleCount;

            // Calculate secondary stats
            const closedReturns = previousTrades
              .filter(t => t.liveStatus === "TP_HIT" || t.liveStatus === "SL_HIT")
              .map(t => t.finalReturn)
              .filter((n): n is number => typeof n === "number" && !isNaN(n));

            const winningReturns = closedReturns.filter(n => n > 0);
            const losingReturns = closedReturns.filter(n => n < 0);

            const avgWin = winningReturns.length > 0 ? (winningReturns.reduce((a, b) => a + b, 0) / winningReturns.length).toFixed(1) : "0.0";
            const avgLoss = losingReturns.length > 0 ? (losingReturns.reduce((a, b) => a + b, 0) / losingReturns.length).toFixed(1) : "0.0";

            // Calculate last 10 returns
            const last10Returns = previousTrades
              .filter(t => t.liveStatus === "TP_HIT" || t.liveStatus === "SL_HIT")
              .slice(0, 10)
              .map(t => t.finalReturn)
              .filter((n): n is number => typeof n === "number" && !isNaN(n));
            const last10ReturnTotal = last10Returns.length > 0 ? last10Returns.reduce((a, b) => a + b, 0).toFixed(1) : "0.0";
            const last10Color = parseFloat(last10ReturnTotal) >= 0 ? "text-green-500" : "text-red-500/80";

            const winRateColor = winRate >= 60 ? "text-green-500" : winRate >= 40 ? "text-yellow-500" : "text-foreground";
            const returnColor = parseFloat(totalReturn) >= 0 ? "text-green-500" : parseFloat(totalReturn) < 0 ? "text-red-500" : "text-foreground";

            return (
              <>
                {/* ── Header ── */}
                <div className={`rounded-t border border-border bg-panel overflow-hidden transition-all ${isClosedTradesOpen ? "border-b border-b-border/10 mb-1" : ""}`}>
                  <button
                    onClick={() => setIsClosedTradesOpen(!isClosedTradesOpen)}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 hover:bg-panel-2/20 transition-all select-none"
                  >
                    {/* LEFT ZONE */}
                    <div className="flex flex-col items-start gap-1.5 mt-1">
                      <span className="font-display font-bold text-2xl text-foreground uppercase tracking-[0.1em] transition-colors">
                        Execution Log
                      </span>
                      <span className="text-[10px] text-muted-foreground/45 font-mono tracking-[0.2em] uppercase font-semibold">
                        Based on executed signals
                      </span>
                    </div>

                    {/* RIGHT ZONE: Structured Blocks */}
                    <div className="flex flex-col items-end gap-3 mt-6 sm:mt-0 w-full sm:w-auto">

                      {/* TOP ROW: Primary Stats */}
                      <div className="flex items-center gap-6 sm:gap-8 pr-1 py-1">

                        {/* TRADES */}
                        <div className="flex flex-col items-start min-w-[40px]">
                          <span className="font-mono font-bold text-xl tabular-nums leading-none text-foreground tracking-tight">
                            {closedCount}
                          </span>
                          <span className="text-[9.5px] text-muted-foreground/50 uppercase tracking-[0.18em] leading-none mt-1.5 font-mono">
                            Trades
                          </span>
                        </div>

                        {/* WIN RATE */}
                        <div className="flex flex-col items-start min-w-[50px]">
                          <span className={`font-mono font-bold text-xl tabular-nums leading-none tracking-tight ${winRateColor}`}>
                            {winRate}%
                          </span>
                          <span className="text-[9.5px] text-muted-foreground/50 uppercase tracking-[0.18em] leading-none mt-1.5 font-mono">
                            Win Rate
                          </span>
                        </div>

                        {/* RETURN */}
                        <div className="flex flex-col items-start min-w-[60px]">
                          <span
                            className={`font-mono font-bold text-xl tabular-nums leading-none tracking-tight ${returnColor}`}
                            style={{ textShadow: parseFloat(totalReturn) >= 0 ? "0 0 12px rgba(34,197,94,0.15)" : "0 0 12px rgba(239,68,68,0.15)" }}
                          >
                            {parseFloat(totalReturn) > 0 ? "+" : ""}{totalReturn}%
                          </span>
                          <span className="text-[9.5px] text-muted-foreground/50 uppercase tracking-[0.18em] leading-none mt-1.5 font-mono">
                            Return
                          </span>
                        </div>

                        {/* CHEVRON (Right bound) */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          className={`text-muted-foreground/30 transition-transform duration-300 flex-shrink-0 ml-2 hidden sm:block ${isClosedTradesOpen ? "rotate-180" : ""}`}>
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>

                      {/* BOTTOM ROW: Secondary Stats */}
                      {closedCount > 0 && (
                        <div className="flex items-center gap-5 sm:pr-8 opacity-90 mt-0.5">
                          <span className="text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase">
                            Avg Win: <span className="font-bold text-green-500 ml-1.5">+{avgWin}%</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase">
                            Avg Loss: <span className="font-bold text-red-500 ml-1.5">{avgLoss}%</span>
                          </span>
                        </div>
                      )}

                    </div>
                  </button>
                </div>

                <AnimatePresence>
                  {isClosedTradesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {/* Column labels */}
                      <div className="grid grid-cols-[1fr_120px_140px] items-center px-5 py-2 border-x border-border bg-panel-2/30">
                        <span className="text-[7.5px] text-muted-foreground/45 uppercase tracking-[0.18em] font-mono">Asset</span>
                        <span className="text-[7.5px] text-muted-foreground/45 uppercase tracking-[0.18em] font-mono text-center">Status</span>
                        <span className="text-[7.5px] text-muted-foreground/45 uppercase tracking-[0.18em] font-mono text-right">Return · Time</span>
                      </div>

                      {/* Rows */}
                      <div className="flex flex-col border-x border-b border-border rounded-b overflow-hidden">
                        {visibleTrades.map((trade, idx) => {
                          const isWin = trade.liveStatus === "TP_HIT";
                          const isLoss = trade.liveStatus === "SL_HIT";
                          const isExpired = trade.liveStatus === "EXPIRED";

                          const refTs = isExpired ? (trade.validUntil ?? trade.timestamp) : (trade.closedAt ?? trade.timestamp);
                          const dateObj = refTs?.toDate ? refTs.toDate() : new Date();
                          const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

                          const returnNum = isWin && typeof trade.finalReturn === "number" ? trade.finalReturn : null;
                          const barColor = isWin ? "bg-green-500/80" : isLoss ? "bg-red-500/80" : "bg-border/40";
                          const hoverBg = isWin
                            ? "hover:bg-green-500/[0.035] hover:shadow-[inset_0_0_24px_rgba(74,222,128,0.04)]"
                            : isLoss
                              ? "hover:bg-red-500/[0.035] hover:shadow-[inset_0_0_24px_rgba(248,113,113,0.04)]"
                              : "hover:bg-panel-2/40";

                          return (
                            <div
                              key={trade.id}
                              className={`group relative grid grid-cols-[1fr_120px_140px] items-center pl-0 pr-5 py-3.5 border-t border-border/25 first:border-t-0 bg-panel transition-all duration-150 ${hoverBg}`}
                              style={{ animationDelay: `${idx * 30}ms` }}
                            >
                              {/* Left accent bar */}
                              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${barColor} opacity-65 group-hover:opacity-100 transition-opacity duration-150`} />

                              {/* COL 1 — Asset + Direction */}
                              <div className="flex items-center gap-3 pl-5 min-w-0">
                                <span className="font-display font-bold text-[14px] text-foreground tracking-tight leading-none w-14 shrink-0">
                                  {trade.asset}
                                </span>
                                <span className={`text-[8px] font-bold tracking-widest uppercase leading-none px-1.5 py-0.5 rounded border ${trade.direction === "LONG" || trade.direction === "BUY"
                                    ? "text-primary border-primary/30 bg-primary/5"
                                    : "text-red-400 border-red-400/30 bg-red-400/5"
                                  }`}>
                                  {trade.direction}
                                </span>
                              </div>

                              {/* COL 2 — Status badge centred */}
                              <div className="flex justify-center">
                                {isWin ? (
                                  <span
                                    className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded text-green-400 bg-green-500/10 border border-green-500/20"
                                    style={{ boxShadow: "0 0 8px rgba(74,222,128,0.14)" }}
                                  >
                                    <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m2 6 3 3 5-5" /></svg>
                                    TP HIT
                                  </span>
                                ) : isLoss ? (
                                  <span
                                    className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded text-red-400 bg-red-500/10 border border-red-500/20"
                                    style={{ boxShadow: "0 0 8px rgba(248,113,113,0.14)" }}
                                  >
                                    <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m2 2 8 8M10 2 2 10" /></svg>
                                    SL HIT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded text-muted-foreground/40 bg-transparent border border-border/30">
                                    <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="6" cy="6" r="4.5" /><path d="M6 3.5V6l1.5 1.5" /></svg>
                                    EXPIRED
                                  </span>
                                )}
                              </div>

                              {/* COL 3 — Return + label + timestamp right-aligned */}
                              <div className="flex flex-col items-end gap-1">
                                {isWin && returnNum != null ? (
                                  <>
                                    <span
                                      className="font-mono font-bold text-[16px] tabular-nums leading-none text-green-400"
                                      style={{ textShadow: "0 0 10px rgba(74,222,128,0.6)" }}
                                    >
                                      +{returnNum.toFixed(1)}%
                                    </span>
                                    <span className="text-[7.5px] text-green-400/55 uppercase tracking-widest leading-none font-mono">Profit Booked</span>
                                  </>
                                ) : isLoss ? (
                                  <>
                                    <span className="font-mono font-bold text-[16px] text-muted-foreground/25 leading-none tabular-nums">—</span>
                                    <span className="text-[7.5px] text-muted-foreground/35 uppercase tracking-widest leading-none font-mono">Loss Exited</span>
                                  </>
                                ) : (
                                  <span className="font-mono text-[14px] text-muted-foreground/20 leading-none">—</span>
                                )}
                                <span className="text-[8px] text-muted-foreground/35 font-mono leading-none tabular-nums mt-0.5">
                                  {dateStr} · {timeStr}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Low-data hint */}
                        {previousTrades.length < 3 && (
                          <div className="px-5 py-3 border-t border-border/20 bg-panel-2/10">
                            <p className="text-[9px] font-mono text-muted-foreground/28 uppercase tracking-widest text-center">
                              More trades will appear as signals complete
                            </p>
                          </div>
                        )}

                        {/* Load More */}
                        {hasMore && (
                          <div className="border-t border-border/25 bg-panel-2/10">
                            <button
                              onClick={() => setVisibleCount(c => c + 10)}
                              className="w-full py-2.5 text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                              Load {Math.min(10, previousTrades.length - visibleCount)} more
                              <span className="text-muted-foreground/30">({previousTrades.length - visibleCount} remaining)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            );
          })()}
        </div>
      )}


      {isLocked && (
        <div className="mt-12 mb-4 flex flex-col items-center justify-center pointer-events-auto">
          <Link to="/pricing" className="px-8 py-3 bg-primary text-primary-foreground font-mono text-sm tracking-widest rounded font-semibold hover:brightness-110 transition-all shadow-xl shadow-primary/20 hover:-translate-y-1">
            UNLOCK ALL TERMINAL SIGNALS
          </Link>
          <p className="text-xs font-mono text-muted-foreground mt-4 uppercase tracking-wider">Active plan upgrade required</p>
        </div>
      )}

    </motion.div>
  );
};

export default DashboardGrid;
