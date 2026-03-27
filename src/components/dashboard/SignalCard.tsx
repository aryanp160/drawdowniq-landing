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
  currentPrice?: number;
  status: 'RUNNING' | 'TP_HIT' | 'SL_HIT' | string;
  liveStatus?: string;
  expReturn?: string;
  timestamp?: any;
  validUntil?: any;
  isBlurred?: boolean;
}

const SignalCard = ({ 
  asset, direction, confidence, entryLow, entryHigh, tp, sl, leverage = 1, currentPrice, status, liveStatus, expReturn, validUntil, isBlurred 
}: SignalCardProps) => {

  const isLong = direction === 'LONG' || direction === 'BUY';

  // Use hoisted liveStatus or fallback
  const finalStatus = liveStatus || status || 'RUNNING';
  const finalReturn = expReturn || "+0.0%";

  // Risk Reward Calculation
  const entryAvg = (entryLow + entryHigh) / 2;
  const riskReward = isLong 
    ? Math.abs((tp - entryAvg) / (entryAvg - sl)).toFixed(1)
    : Math.abs((entryAvg - tp) / (sl - entryAvg)).toFixed(1);

  // Countdown Logic
  const [timeLeft, setTimeLeft] = useState<string>("--h --m");

  useEffect(() => {
    if (!validUntil) return;
    
    // Convert Firestore Timestamp to Date, or parse string
    const targetDate = validUntil?.toDate ? validUntil.toDate() : new Date(validUntil);
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      
      if (distance < 0) {
        setTimeLeft("Expired");
        return;
      }
      
      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [validUntil]);

  const minVal = Math.min(sl, entryLow, tp);
  const maxVal = Math.max(sl, entryHigh, tp);
  const range = maxVal - minVal;
  
  const getPos = (val: number) => Math.max(0, Math.min(100, ((val - minVal) / (range || 1)) * 100));
  const currPrice = currentPrice || (entryLow + entryHigh) / 2 + (isLong ? 10 : -10); 
  const currPos = getPos(currPrice);

  return (
    <motion.div 
      className={`panel-glow p-4 flex flex-col gap-3.5 rounded border border-border bg-panel text-[13px] font-mono transition-all ${isBlurred ? "blur-[5px] opacity-40 select-none pointer-events-none" : "hover:bg-panel-2/30"}`}
      whileHover={{ y: isBlurred ? 0 : -2 }}
    >
      {/* Header: Asset + Direction + Confidence */}
      <div className="flex items-start justify-between border-b border-border/50 pb-2.5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[22px] text-foreground leading-none tracking-tight">{isBlurred ? "***" : asset}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isLong ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
              {isBlurred ? "---" : direction}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Confidence</span>
            <span className="text-foreground font-semibold text-sm leading-none">{isBlurred ? "--" : confidence}</span>
            <span className="text-[10px] text-muted-foreground uppercase opacity-40 ml-1">|</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">R:R</span>
            <span className="text-foreground font-semibold text-sm leading-none">{isBlurred ? "-.-" : `1:${riskReward}`}</span>
            <span className="text-[10px] text-muted-foreground uppercase opacity-40 ml-1">|</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Lev</span>
            <span className="text-foreground font-semibold text-sm leading-none">{leverage}x</span>
          </div>
        </div>
        <div className="flex flex-col items-end pt-1">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${finalStatus === 'RUNNING' && timeLeft !== 'Expired' ? 'bg-warning/10 border border-warning/20' : 'bg-panel-2 border border-border/50 opacity-60'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${finalStatus === 'RUNNING' && timeLeft !== 'Expired' ? 'bg-warning animate-pulse' : 'bg-muted-foreground'}`} />
            <span className={`text-[9px] uppercase font-bold tracking-widest ${finalStatus === 'RUNNING' && timeLeft !== 'Expired' ? 'text-warning' : 'text-muted-foreground'}`}>
              Valid: {isBlurred ? "--h --m" : timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Entry, TP, SL */}
      <div className="grid grid-cols-3 gap-3 py-1.5">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase leading-none mb-0.5">Entry Zone</span>
          <span className="text-xs text-foreground font-semibold leading-none">{isBlurred ? "-.--" : entryLow}</span>
          <span className="text-[10px] text-muted-foreground leading-none">{isBlurred ? "-.--" : entryHigh}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase leading-none mb-0.5">Take Profit</span>
          <span className="text-xs text-green-500 font-semibold leading-none">{isBlurred ? "-.--" : tp}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground uppercase leading-none mb-0.5">Stop Loss</span>
          <span className="text-xs text-destructive font-semibold leading-none">{isBlurred ? "-.--" : sl}</span>
        </div>
      </div>

      {/* Risk Reward Bar */}
      <div className="flex flex-col gap-1.5 mt-1">
        <div className="flex items-center justify-between text-[8px] text-muted-foreground uppercase leading-none mb-0.5">
          <span>{isLong ? 'SL' : 'TP'}</span>
          <span>{isLong ? 'TP' : 'SL'}</span>
        </div>
        <div className="relative h-1.5 bg-panel-2 rounded-full overflow-visible flex items-center">
          {/* Base Track */}
          <div className="absolute inset-0 bg-panel-2 rounded-full" />
          
          {/* SL Zone (red) */}
          <div className="absolute h-full bg-destructive/50 rounded-full" style={{ left: isLong ? 0 : `${getPos(entryHigh)}%`, right: isLong ? `${100 - getPos(entryLow)}%` : 0 }} />
          
          {/* Entry Zone (neutral) */}
          <div className="absolute h-full bg-muted-foreground/60 rounded-full z-0" style={{ left: `${getPos(Math.min(entryLow, entryHigh))}%`, right: `${100 - getPos(Math.max(entryLow, entryHigh))}%` }} />
          
          {/* TP Zone (green) */}
          <div className="absolute h-full bg-primary/50 rounded-full" style={{ left: isLong ? `${getPos(entryHigh)}%` : 0, right: isLong ? 0 : `${100 - getPos(entryLow)}%` }} />
          
          {/* Current Price Pointer */}
          {!isBlurred && (
            <div className="absolute w-[3px] h-3 bg-foreground rounded shadow-sm shadow-black z-10 transition-all duration-1000 -translate-y-1" style={{ left: `calc(${currPos}% - 1px)` }} />
          )}
        </div>
      </div>

      {/* Footer: Status / Expected return */}
      <div className="flex items-center justify-between pt-3 mt-1.5 border-t border-border/50">
        {finalStatus === 'TP_HIT' ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            <span className="text-[10.5px] uppercase tracking-widest text-green-500 font-bold">{isBlurred ? "UNKNOWN" : "TARGET ACHIEVED"}</span>
          </div>
        ) : finalStatus === 'SL_HIT' ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
            <span className="text-[10.5px] uppercase tracking-widest text-destructive font-bold">{isBlurred ? "UNKNOWN" : "STOPPED OUT"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] animate-pulse" />
            <span className="text-[10.5px] uppercase tracking-widest text-foreground font-bold">{isBlurred ? "UNKNOWN" : "ACTIVE POSITION"}</span>
          </div>
        )}
        <span className={`text-xs font-semibold ${finalStatus === 'TP_HIT' ? 'text-green-500' : finalStatus === 'SL_HIT' ? 'text-destructive' : 'text-primary'}`}>
          {isBlurred ? "---%" : finalReturn} {finalStatus === 'RUNNING' ? 'Expected' : 'Finalised'}
        </span>
      </div>
    </motion.div>
  );
};

export default SignalCard;
