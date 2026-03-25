import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";

const assets = ["BTC", "ETH", "SOL", "LINK", "ARB", "SEI", "AVAX"];
const actions = ["BUY", "SELL"];

const generateId = () => Math.random().toString(36).substr(2, 9);

const initialTrades = [
  { id: generateId(), time: "6:21:40 PM", action: "SELL", asset: "BTC", value: "2.72" },
  { id: generateId(), time: "6:21:38 PM", action: "BUY", asset: "SEI", value: "0.28" },
  { id: generateId(), time: "6:21:36 PM", action: "BUY", asset: "SOL", value: "3.74" },
  { id: generateId(), time: "6:21:34 PM", action: "BUY", asset: "LINK", value: "1.98" },
  { id: generateId(), time: "6:21:32 PM", action: "SELL", asset: "SEI", value: "3.07" },
  { id: generateId(), time: "6:21:30 PM", action: "BUY", asset: "BTC", value: "1.52" },
  { id: generateId(), time: "6:21:28 PM", action: "SELL", asset: "SEI", value: "4.79" },
  { id: generateId(), time: "6:21:26 PM", action: "BUY", asset: "BTC", value: "3.88" },
  { id: generateId(), time: "6:21:25 PM", action: "SELL", asset: "SEI", value: "2.25" },
  { id: generateId(), time: "6:20:48 PM", action: "SELL", asset: "ETH", value: "2.52" },
  { id: generateId(), time: "6:19:48 PM", action: "SELL", asset: "ARB", value: "3.06" },
];

interface LiveFeedProps {
  variant?: "preview" | "real";
  isLocked?: boolean;
}

const LiveFeed = ({ variant = "preview", isLocked = false }: LiveFeedProps) => {
  const [trades, setTrades] = useState<any[]>(initialTrades);

  useEffect(() => {
    if (variant === "real") {
      const q = query(collection(db, "signals"), orderBy("timestamp", "desc"), limit(10));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTrades = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            time: data.timestamp ? new Date(data.timestamp.toMillis()).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute:'2-digit', second:'2-digit' }) : "Live",
            action: data.direction || "BUY",
            asset: data.asset || "UNK",
          }
        });
        if (fetchedTrades.length > 0) {
          setTrades(fetchedTrades);
        }
      });
      return () => unsubscribe();
    } else {
      let timeoutId: NodeJS.Timeout;
      const addTrade = () => {
        const newTrade = {
          id: generateId(),
          time: new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute:'2-digit', second:'2-digit' }),
          action: actions[Math.floor(Math.random() * actions.length)],
          value: (Math.random() * 5 + 0.1).toFixed(2),
          entryLow: "61,200",
          entryHigh: "61,850",
          tp1: "63,500",
          tp2: "65,000",
          stopLoss: "59,000",
        };
        setTrades(prev => {
          const updated = [newTrade, ...prev];
          return updated.slice(0, 12);
        });
        const nextDelay = Math.random() * 3000 + 3000;
        timeoutId = setTimeout(addTrade, nextDelay);
      };
      timeoutId = setTimeout(addTrade, Math.random() * 3000 + 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [variant]);

  return (
    <div className="panel-glow panel-float p-4 reveal-up reveal-delay-4 h-full flex flex-col relative overflow-hidden">
      {isLocked && (
        <div className="absolute bottom-0 left-0 right-0 h-[70%] bg-gradient-to-t from-background via-background/90 to-transparent z-10 flex flex-col items-center justify-end pb-8">
          <Link to="/pricing" className="px-5 py-2 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded font-semibold hover:brightness-110 transition-all shadow-xl shadow-primary/20">
            UNLOCK ALL SIGNALS
          </Link>
          <p className="text-[10px] font-mono text-muted-foreground mt-3 uppercase tracking-wider">Plan upgrade required</p>
        </div>
      )}
      <div className="flex flex-col mb-3 pb-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            Live Execution Log
          </span>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse duration-[3000ms]" />
        </div>
        <span className="text-[9px] font-mono text-muted-foreground/50 tracking-wider mt-1 uppercase">
          Levels based on volatility and liquidity zones
        </span>
      </div>

      <div className="space-y-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
        <AnimatePresence initial={false}>
          {trades.map((trade, i) => {
            const isBlurred = isLocked && i >= 2;
            return (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className={`flex flex-col py-2.5 px-3 rounded text-xs font-mono transition-all border ${
                  i === 0 && !isBlurred ? "bg-panel-2 border-border" : "border-transparent hover:bg-panel-2/30"
                } ${isBlurred ? "blur-[4px] opacity-40 select-none pointer-events-none" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 font-semibold ${trade.action === "BUY" ? "text-primary" : "text-destructive"}`}>
                      {isBlurred ? "---" : trade.action}
                    </span>
                    <span className="text-foreground w-12 font-semibold text-sm">{isBlurred ? "***" : trade.asset}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-foreground font-semibold">{isBlurred ? "-.--" : trade.value}</span>
                    <span className="text-muted-foreground w-20 text-right">{trade.time}</span>
                  </div>
                </div>

                {!isBlurred && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-border/50">
                    <div className="flex flex-col">
                      <span className="text-[8px] tracking-[0.15em] text-muted-foreground uppercase mb-1">Entry Zone</span>
                      <span className="text-[10px] font-semibold text-foreground">{trade.entryLow || "61,800"}–{trade.entryHigh || "62,200"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] tracking-[0.15em] text-muted-foreground uppercase mb-1">Take Profit</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold text-green-500">TP1: {trade.tp1 || "63,500"}</span>
                        <span className="text-[10px] font-semibold text-green-500">TP2: {trade.tp2 || "65,000"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] tracking-[0.15em] text-muted-foreground uppercase mb-1">Stop Loss</span>
                      <span className="text-[10px] font-semibold text-destructive">{trade.stopLoss || "59,000"}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveFeed;
