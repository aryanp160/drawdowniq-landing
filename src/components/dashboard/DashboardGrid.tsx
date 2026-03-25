import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
          <h3 className="font-display font-bold text-[11px] text-muted-foreground uppercase tracking-[0.2em] mb-4">Previous Executions</h3>
          <div className="flex flex-col gap-2.5">
            {previousTrades.map((trade) => (
              <div key={trade.id} className="panel-glow px-4 py-3 rounded border border-border bg-panel-2/50 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-4">
                  <span className="font-display font-bold text-sm text-foreground w-12">{trade.asset}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase ${trade.direction === 'LONG' || trade.direction === 'BUY' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                    {trade.direction} x{trade.leverage}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  {trade.liveStatus === 'TP_HIT' ? (
                    <span className="text-green-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                      TP HIT
                    </span>
                  ) : (
                    <span className="text-destructive font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                      SL HIT
                    </span>
                  )}
                  <span className={`font-semibold ${trade.liveStatus === 'TP_HIT' ? 'text-green-500' : 'text-destructive'} w-16 text-right text-[11px] tracking-wide`}>
                    {trade.expReturn}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
