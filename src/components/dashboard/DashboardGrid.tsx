import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";
import SignalCard from "./SignalCard";

interface DashboardGridProps {
  variant?: "preview" | "real";
  className?: string;
  isLocked?: boolean;
}

// Binance symbol mapping: asset → USDT perpetual ticker
const assetToBinanceSymbol: Record<string, string> = {
  "BTC":  "BTCUSDT",
  "ETH":  "ETHUSDT",
  "SOL":  "SOLUSDT",
  "LINK": "LINKUSDT",
  "AVAX": "AVAXUSDT",
  "ARB":  "ARBUSDT",
  "SUI":  "SUIUSDT",
  "APT":  "APTUSDT",
  "BNB":  "BNBUSDT",
  "DOGE": "DOGEUSDT",
  "XRP":  "XRPUSDT",
  "ADA":  "ADAUSDT",
  "DOT":  "DOTUSDT",
  "MATIC": "MATICUSDT",
  "OP":   "OPUSDT",
};

const DashboardGrid = ({ variant = "preview", className = "", isLocked = false }: DashboardGridProps) => {
  const [trades, setTrades] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isClosedTradesOpen, setIsClosedTradesOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "signals"), orderBy("timestamp", "desc"), limit(6));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTrades = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          asset: data.asset,
          direction: data.direction,
          confidence: data.confidence,
          entryLow: Number(data.entryLow),
          entryHigh: Number(data.entryHigh),
          tp: Number(data.tp),
          sl: Number(data.sl),
          leverage: Number(data.leverage || 1),
          status: data.status || "RUNNING",
          validUntil: data.validUntil,
          timestamp: data.timestamp
        };
      });
      setTrades(fetchedTrades);
    });
    return () => unsubscribe();
  }, []);

  // ── Binance Live Price Integration (7-second refresh) ──────────────────
  useEffect(() => {
    if (trades.length === 0) return;

    const fetchPrices = async () => {
      const uniqueAssets = Array.from(new Set(trades.map(t => t.asset).filter(Boolean))) as string[];
      if (uniqueAssets.length === 0) return;

      // Fetch each asset individually to avoid quoting issues with JSON array
      const results = await Promise.allSettled(
        uniqueAssets.map(async (asset) => {
          const symbol = assetToBinanceSymbol[asset] ?? `${asset}USDT`;
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return { asset, price: parseFloat(data.price) };
        })
      );

      const newPrices: Record<string, number> = {};
      results.forEach(r => {
        if (r.status === "fulfilled" && !isNaN(r.value.price)) {
          newPrices[r.value.asset] = r.value.price;
        }
      });
      // Merge so previously loaded prices persist if an asset temporarily fails
      setPrices(prev => ({ ...prev, ...newPrices }));
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 7_000);
    return () => clearInterval(interval);
  }, [trades]);

  const processedTrades = trades.map(trade => {
    let liveStatus = trade.status || 'RUNNING';
    const currentPrice = prices[trade.asset];
    const isLong = trade.direction === 'LONG' || trade.direction === 'BUY';
    const leverage = trade.leverage || 1;
    let expReturn: string | null = null;

    // Determine live status from current price if still RUNNING
    if (currentPrice && liveStatus === 'RUNNING') {
      if (isLong) {
        if (currentPrice >= trade.tp) liveStatus = 'TP_HIT';
        else if (currentPrice <= trade.sl) liveStatus = 'SL_HIT';
      } else {
        if (currentPrice <= trade.tp) liveStatus = 'TP_HIT';
        else if (currentPrice >= trade.sl) liveStatus = 'SL_HIT';
      }
    }

    // Calculate expected / realized return
    if (liveStatus === 'TP_HIT') {
      // Realized gain at TP from entry midpoint
      const pct = isLong
        ? ((trade.tp - trade.entryLow) / trade.entryLow) * leverage * 100
        : ((trade.entryLow - trade.tp) / trade.entryLow) * leverage * 100;
      expReturn = `+${pct.toFixed(1)}%`;
    } else if (liveStatus === 'SL_HIT') {
      // Realized loss at SL (always negative)
      const pct = isLong
        ? ((trade.sl - trade.entryLow) / trade.entryLow) * leverage * 100
        : ((trade.entryLow - trade.sl) / trade.entryLow) * leverage * 100;
      // pct is negative for a loss
      expReturn = `${pct.toFixed(1)}%`;
    } else if (currentPrice) {
      // Expected return from current price to TP
      const pct = isLong
        ? ((trade.tp - currentPrice) / currentPrice) * leverage * 100
        : ((currentPrice - trade.tp) / currentPrice) * leverage * 100;
      expReturn = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
    }

    return { ...trade, liveStatus, expReturn, leverage };
  });

  const activeTrades = processedTrades.filter(t => t.liveStatus === 'RUNNING');
  const previousTrades = processedTrades.filter(t => t.liveStatus !== 'RUNNING');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      viewport={{ once: true, margin: "-50px" }} 
      transition={{ duration: 0.5 }}
      className={`relative ${className}`}
    >
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 lg:auto-rows-fr`}>
        {activeTrades.map((trade, i) => {
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

      {!isLocked && previousTrades.length > 0 && (
        <div className="mt-8 border-t border-border/50 pt-6 reveal-up">
          {(() => {
            const totalTrades = previousTrades.length;
            const winningTrades = previousTrades.filter(t => t.liveStatus === 'TP_HIT').length;
            const losingTrades  = previousTrades.filter(t => t.liveStatus === 'SL_HIT').length;
            const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
            const validReturns = previousTrades
              .map(t => parseFloat((t.expReturn ?? "").replace('+', '').replace('%', '')))
              .filter(n => !isNaN(n));
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
                      {totalTrades} SIGNALS
                    </span>
                  </div>

                  {/* Right: stats pills + chevron */}
                  <div className="flex items-center gap-5">
                    <div className="hidden sm:flex items-center divide-x divide-border/50">
                      <div className="flex flex-col items-center px-4 first:pl-0">
                        <span className="text-[8px] text-muted-foreground uppercase tracking-widest leading-none mb-1">Win Rate</span>
                        <span className={`font-mono font-bold text-[11px] leading-none tabular-nums ${winRate >= 50 ? 'text-green-500' : 'text-destructive'}`}>
                          {winRate}%
                        </span>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <span className="text-[8px] text-muted-foreground uppercase tracking-widest leading-none mb-1">Avg Return</span>
                        <span className={`font-mono font-bold text-[11px] leading-none tabular-nums ${parseFloat(avgReturn) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                          {parseFloat(avgReturn) > 0 ? '+' : ''}{avgReturn}%
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
                      className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ${isClosedTradesOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6"/>
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
                          const isWin = trade.liveStatus === 'TP_HIT';
                          const dateObj = trade.timestamp?.toDate ? trade.timestamp.toDate() : new Date();
                          const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                          const returnVal = parseFloat((trade.expReturn ?? "0").replace('+', '').replace('%', ''));

                          return (
                            <div
                              key={trade.id}
                              className={`
                                group relative grid grid-cols-[1fr_auto_auto] gap-x-4 items-center
                                pl-0 pr-4 py-2
                                border-t border-border/40 first:border-t-0
                                bg-panel hover:bg-panel-2/50
                                transition-all duration-150
                                ${isWin ? 'hover:shadow-[inset_0_0_20px_rgba(34,197,94,0.04)]' : 'hover:shadow-[inset_0_0_20px_rgba(239,68,68,0.04)]'}
                              `}
                              style={{ animationDelay: `${idx * 30}ms` }}
                            >
                              {/* Left bar indicator */}
                              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isWin ? 'bg-green-500/70' : 'bg-destructive/70'}`} />

                              {/* COL 1: Asset + Direction */}
                              <div className="flex items-center gap-2.5 pl-4 min-w-0">
                                <span className="font-display font-bold text-[13px] text-foreground tracking-tight leading-none w-12 shrink-0">
                                  {trade.asset}
                                </span>
                                <span className={`text-[8.5px] font-bold tracking-widest uppercase leading-none px-1 py-0.5 rounded-sm border ${
                                  trade.direction === 'LONG' || trade.direction === 'BUY'
                                    ? 'text-primary border-primary/30 bg-primary/5'
                                    : 'text-destructive border-destructive/30 bg-destructive/5'
                                }`}>
                                  {trade.direction}
                                </span>
                              </div>

                              {/* COL 2: Status badge */}
                              <div className="w-20 flex justify-center">
                                <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                                  isWin
                                    ? 'text-green-500 bg-green-500/10 border border-green-500/20'
                                    : 'text-destructive bg-destructive/10 border border-destructive/20'
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${isWin ? 'bg-green-500' : 'bg-destructive'}`} />
                                  {isWin ? 'TP HIT' : 'SL HIT'}
                                </span>
                              </div>

                              {/* COL 3: Return + Timestamp */}
                              <div className="w-32 flex flex-col items-end gap-0.5">
                                <span className={`font-mono font-bold text-[12px] tabular-nums leading-none ${isWin ? 'text-green-500' : 'text-destructive'}`}>
                                  {returnVal > 0 ? '+' : ''}{returnVal.toFixed(1)}%
                                </span>
                                <span className="text-[8.5px] text-muted-foreground font-mono leading-none tabular-nums">
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
