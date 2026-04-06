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
    const q = query(collection(db, "signals"), orderBy("timestamp", "desc"), limit(10));
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
    const interval = setInterval(fetchPrices, 7_000);
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
      if (filterLev === "low"  && t.leverage >= 5)  return false;
      if (filterLev === "mid"  && (t.leverage < 5 || t.leverage > 10)) return false;
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded border text-[11px] font-mono font-bold uppercase tracking-widest transition-all ${
                filterOpen || activeFilterCount > 0
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
                        className={`flex-1 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-widest border transition-all ${
                          filterDir === v
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
                      { val: "all",  label: "All" },
                      { val: "low",  label: "Low  (<5x)" },
                      { val: "mid",  label: "Med  (5–10x)" },
                      { val: "high", label: "High (>10x)" },
                    ] as const).map(({ val, label }) => (
                      <button
                        key={val}
                        onClick={() => setFilterLev(val)}
                        className={`text-left px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                          filterLev === val
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
        {filteredTrades.map((trade, i) => {
          const blurred = isLocked && i >= 2;
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
            const allCount = previousTrades.length; // for badge — includes EXPIRED
            const winningTrades = previousTrades.filter(t => t.liveStatus === "TP_HIT").length;
            const losingTrades = previousTrades.filter(t => t.liveStatus === "SL_HIT").length;
            const closedCount = winningTrades + losingTrades; // EXPIRED excluded from rate
            const winRate = closedCount > 0 ? Math.round((winningTrades / closedCount) * 100) : 0;

            // Use stored finalReturn (TP_HIT only) for avg — never live calc
            const validReturns = previousTrades
              .filter(t => t.liveStatus === "TP_HIT")
              .map(t => t.finalReturn)
              .filter((n): n is number => typeof n === "number" && !isNaN(n));
            const avgReturn = validReturns.length > 0
              ? (validReturns.reduce((a, b) => a + b, 0) / validReturns.length).toFixed(1)
              : "0.0";

            return (
              <>
                {/* ── Collapsible header ── */}
                <button
                  onClick={() => setIsClosedTradesOpen(!isClosedTradesOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-t border border-border bg-panel hover:bg-panel-2/60 transition-all group"
                >
                  {/* Left: title */}
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-sm text-foreground uppercase tracking-[0.18em] group-hover:text-primary transition-colors">
                      Execution Log
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-border/60 text-[9px] font-mono text-muted-foreground tracking-widest">
                      {allCount} SIGNALS
                    </span>
                  </div>

                  {/* Right: stats pills + chevron */}
                  <div className="flex items-center gap-5">
                    <div className="hidden sm:flex items-center divide-x divide-border/50">
                      <div className="flex flex-col items-center px-4 first:pl-0">
                        <span className="text-[8px] text-muted-foreground uppercase tracking-widest leading-none mb-1">Win Rate</span>
                        <span className={`font-mono font-bold text-[11px] leading-none tabular-nums ${winRate >= 50 ? "text-green-500" : "text-destructive"}`}>
                          {winRate}%
                        </span>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <span className="text-[8px] text-muted-foreground uppercase tracking-widest leading-none mb-1">Avg Return</span>
                        <span className={`font-mono font-bold text-[11px] leading-none tabular-nums ${parseFloat(avgReturn) >= 0 ? "text-green-500" : "text-destructive"}`}>
                          {parseFloat(avgReturn) > 0 ? "+" : ""}{avgReturn}%
                        </span>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <span className="text-[8px] text-muted-foreground uppercase tracking-widest leading-none mb-1">TP / SL</span>
                        <span className="font-mono font-bold text-[11px] leading-none tabular-nums text-foreground">
                          <span className="text-green-500">{winningTrades}</span>
                          <span className="text-muted-foreground/50 mx-0.5">/</span>
                          <span className="text-destructive">{losingTrades}</span>
                        </span>
                      </div>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ${isClosedTradesOpen ? "rotate-180" : ""}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </button>

                <AnimatePresence>
                  {isClosedTradesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {/* Column header */}
                      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-4 py-1.5 border-x border-border bg-panel-2/20">
                        <span className="text-[8px] text-muted-foreground uppercase tracking-[0.15em] font-mono">Asset</span>
                        <span className="text-[8px] text-muted-foreground uppercase tracking-[0.15em] font-mono text-center w-20">Status</span>
                        <span className="text-[8px] text-muted-foreground uppercase tracking-[0.15em] font-mono text-right w-32">Return · Time</span>
                      </div>

                      {/* Rows */}
                      <div className="flex flex-col border-x border-b border-border rounded-b overflow-hidden">
                        {previousTrades.map((trade, idx) => {
                          const isWin     = trade.liveStatus === "TP_HIT";
                          const isLoss    = trade.liveStatus === "SL_HIT";
                          const isExpired = trade.liveStatus === "EXPIRED";

                          // For expired trades prefer validUntil as the reference time
                          const refTs = isExpired
                            ? (trade.validUntil ?? trade.timestamp)
                            : (trade.closedAt ?? trade.timestamp);
                          const dateObj = refTs?.toDate ? refTs.toDate() : new Date();
                          const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                          const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

                          // Only show a profit figure for TP_HIT
                          const returnNum = isWin && typeof trade.finalReturn === "number" ? trade.finalReturn : null;

                          const barColor  = isWin ? "bg-green-500/70" : isLoss ? "bg-destructive/70" : "bg-border/50";
                          const rowShadow = isWin
                            ? "hover:shadow-[inset_0_0_20px_rgba(34,197,94,0.04)]"
                            : isLoss
                            ? "hover:shadow-[inset_0_0_20px_rgba(239,68,68,0.04)]"
                            : "";

                          return (
                            <div
                              key={trade.id}
                              className={`
                                group relative grid grid-cols-[1fr_auto_auto] gap-x-4 items-center
                                pl-0 pr-4 py-2
                                border-t border-border/40 first:border-t-0
                                bg-panel hover:bg-panel-2/50
                                transition-all duration-150
                                ${rowShadow}
                              `}
                              style={{ animationDelay: `${idx * 30}ms` }}
                            >
                              {/* Left bar indicator */}
                              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${barColor}`} />

                              {/* COL 1: Asset + Direction */}
                              <div className="flex items-center gap-2.5 pl-4 min-w-0">
                                <span className="font-display font-bold text-[13px] text-foreground tracking-tight leading-none w-12 shrink-0">
                                  {trade.asset}
                                </span>
                                <span className={`text-[8.5px] font-bold tracking-widest uppercase leading-none px-1 py-0.5 rounded-sm border ${
                                  trade.direction === "LONG" || trade.direction === "BUY"
                                    ? "text-primary border-primary/30 bg-primary/5"
                                    : "text-destructive border-destructive/30 bg-destructive/5"
                                }`}>
                                  {trade.direction}
                                </span>
                              </div>

                              {/* COL 2: Status badge */}
                              <div className="w-20 flex justify-center">
                                {isWin ? (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm text-green-500 bg-green-500/10 border border-green-500/20">
                                    <span className="w-1 h-1 rounded-full bg-green-500" />
                                    TP HIT
                                  </span>
                                ) : isLoss ? (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm text-destructive bg-destructive/10 border border-destructive/20">
                                    <span className="w-1 h-1 rounded-full bg-destructive" />
                                    SL HIT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm text-muted-foreground bg-muted/10 border border-border/50">
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                    EXPIRED
                                  </span>
                                )}
                              </div>

                              {/* COL 3: Return label + Timestamp */}
                              <div className="w-32 flex flex-col items-end gap-0.5">
                                {isWin && returnNum != null ? (
                                  <>
                                    <span className="font-mono font-bold text-[12px] tabular-nums leading-none text-green-500">
                                      +{returnNum.toFixed(1)}%
                                    </span>
                                    <span className="text-[7.5px] text-green-500/70 uppercase tracking-widest leading-none font-mono">
                                      Profit Booked
                                    </span>
                                  </>
                                ) : isLoss ? (
                                  <>
                                    <span className="font-mono text-[12px] text-muted-foreground/40 leading-none">—</span>
                                    <span className="text-[7.5px] text-muted-foreground/50 uppercase tracking-widest leading-none font-mono">
                                      Loss Exited
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-mono text-[10px] text-muted-foreground/30 leading-none">—</span>
                                )}
                                <span className="text-[8.5px] text-muted-foreground font-mono leading-none tabular-nums mt-0.5">
                                  {dateStr} · {timeStr}
                                </span>
                              </div>
                            </div>
                          );
                        })}
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
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-background via-background/90 to-transparent z-10 flex flex-col items-center justify-end pb-12 pointer-events-auto">
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
