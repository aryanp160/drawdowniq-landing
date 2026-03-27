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

const assetToCoinGeckoId: Record<string, string> = {
  "BTC": "bitcoin",
  "ETH": "ethereum",
  "SOL": "solana",
  "LINK": "chainlink",
  "AVAX": "avalanche-2",
  "ARB": "arbitrum",
  "SUI": "sui",
  "APT": "aptos"
};

const DashboardGrid = ({ variant = "preview", className = "", isLocked = false }: DashboardGridProps) => {
  const [trades, setTrades] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isClosedTradesOpen, setIsClosedTradesOpen] = useState(false);

  useEffect(() => {
    // We enforce 100% dynamic loading over the static grids globally now
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
        }
      });
      setTrades(fetchedTrades);
    });
    return () => unsubscribe();
  }, []);

  // CoinGecko Live Price Integration
  useEffect(() => {
    if (trades.length === 0) return;

    const fetchPrices = async () => {
      const uniqueAssets = Array.from(new Set(trades.map(t => t.asset).filter(Boolean)));
      if (uniqueAssets.length === 0) return;
      
      const ids = uniqueAssets.map(a => assetToCoinGeckoId[a] || a.toLowerCase()).join(",");
      
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await res.json();
        const newPrices: Record<string, number> = {};
        uniqueAssets.forEach(asset => {
          const id = assetToCoinGeckoId[asset] || asset.toLowerCase();
          if (data[id]?.usd) {
            newPrices[asset] = data[id].usd;
          }
        });
        setPrices(newPrices);
      } catch (err) {
        console.error("CoinGecko price fetch failed:", err);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); 
    return () => clearInterval(interval);
  }, [trades]);

  const processedTrades = trades.map(trade => {
    let liveStatus = trade.status || 'RUNNING';
    const currentPrice = prices[trade.asset];
    const isLong = trade.direction === 'LONG' || trade.direction === 'BUY';
    const leverage = trade.leverage || 1;
    let expReturn = "+0.0%";
    
    if (currentPrice && liveStatus === 'RUNNING') {
      if (isLong) {
        if (currentPrice >= trade.tp) liveStatus = 'TP_HIT';
        if (currentPrice <= trade.sl) liveStatus = 'SL_HIT';
      } else {
        if (currentPrice <= trade.tp) liveStatus = 'TP_HIT';
        if (currentPrice >= trade.sl) liveStatus = 'SL_HIT';
      }
    }

    if (liveStatus === 'TP_HIT') {
      expReturn = isLong
        ? `+${(((trade.tp - trade.entryLow) / trade.entryLow) * leverage * 100).toFixed(1)}%`
        : `+${(((trade.entryLow - trade.tp) / trade.entryLow) * leverage * 100).toFixed(1)}%`;
    } else if (liveStatus === 'SL_HIT') {
      expReturn = isLong
        ? `${(((trade.sl - trade.entryLow) / trade.entryLow) * leverage * 100).toFixed(1)}%`
        : `${(((trade.entryLow - trade.sl) / trade.entryLow) * leverage * 100).toFixed(1)}%`;
    } else if (currentPrice) {
      expReturn = isLong
        ? `${(((trade.tp - currentPrice) / currentPrice) * leverage * 100).toFixed(1)}%`
        : `${(((currentPrice - trade.tp) / currentPrice) * leverage * 100).toFixed(1)}%`;
      if (!expReturn.startsWith("-")) expReturn = "+" + expReturn;
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
            const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
            const validReturns = previousTrades.map(t => parseFloat(t.expReturn.replace('+', '').replace('%', ''))).filter(n => !isNaN(n));
            const avgReturn = validReturns.length > 0 ? (validReturns.reduce((a,b) => a + b, 0) / validReturns.length).toFixed(1) : "0.0";
            
            return (
              <>
                <button 
                  onClick={() => setIsClosedTradesOpen(!isClosedTradesOpen)}
                  className="w-full flex items-center justify-between p-4 rounded border border-border bg-panel hover:bg-panel-2 transition-all group"
                >
                  <div className="flex flex-col items-start gap-1">
                    <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-[0.2em] group-hover:text-primary transition-colors">Closed Trades</h3>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.1em]">Based on executed signals</span>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Stats Row */}
                    <div className="hidden sm:flex items-center gap-6 mr-4 opacity-80">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Win Rate</span>
                        <span className={`font-mono font-bold text-xs leading-none ${winRate >= 50 ? 'text-green-500' : 'text-foreground'}`}>{winRate}%</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Avg Return</span>
                        <span className={`font-mono font-bold text-xs leading-none ${parseFloat(avgReturn) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                          {parseFloat(avgReturn) > 0 ? '+' : ''}{avgReturn}%
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Total</span>
                        <span className="font-mono font-bold text-xs leading-none text-foreground">{totalTrades}</span>
                      </div>
                    </div>
                    <svg 
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
                      className={`text-muted-foreground transition-transform duration-300 ${isClosedTradesOpen ? 'rotate-180' : ''}`}
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
                      className="overflow-hidden mt-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        {previousTrades.map((trade) => {
                          const dateObj = trade.timestamp?.toDate ? trade.timestamp.toDate() : new Date();
                          const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={trade.id} className="px-4 py-3 rounded border border-border/50 bg-panel-2/30 flex items-center justify-between text-[11px] font-mono hover:bg-panel-2/80 transition-colors relative overflow-hidden">
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${trade.liveStatus === 'TP_HIT' ? 'bg-green-500/50' : 'bg-destructive/50'}`} />
                              <div className="flex items-center gap-3 pl-2">
                                <span className="font-display font-bold text-[13px] text-foreground w-12">{trade.asset}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase ${trade.direction === 'LONG' || trade.direction === 'BUY' ? 'text-primary' : 'text-destructive'}`}>
                                  {trade.direction}
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
                                <span className={`font-bold sm:w-16 text-right text-xs ${trade.liveStatus === 'TP_HIT' ? 'text-green-500' : 'text-destructive'}`}>
                                  {trade.expReturn}
                                </span>
                                <span className="text-[10px] text-muted-foreground sm:w-24 text-right uppercase tracking-wider">{dateStr}</span>
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
