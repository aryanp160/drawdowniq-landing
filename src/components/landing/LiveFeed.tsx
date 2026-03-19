import { useState, useEffect } from "react";

const initialTrades = [
  { time: "6:21:40 PM", action: "SELL", asset: "BTC", value: "2.72" },
  { time: "6:21:38 PM", action: "BUY", asset: "SEI", value: "0.28" },
  { time: "6:21:36 PM", action: "BUY", asset: "SOL", value: "3.74" },
  { time: "6:21:34 PM", action: "BUY", asset: "LINK", value: "1.98" },
  { time: "6:21:32 PM", action: "SELL", asset: "SEI", value: "3.07" },
  { time: "6:21:30 PM", action: "BUY", asset: "BTC", value: "1.52" },
  { time: "6:21:28 PM", action: "SELL", asset: "SEI", value: "4.79" },
  { time: "6:21:26 PM", action: "BUY", asset: "BTC", value: "3.88" },
  { time: "6:21:25 PM", action: "SELL", asset: "SEI", value: "2.25" },
  { time: "6:20:48 PM", action: "SELL", asset: "ETH", value: "2.52" },
  { time: "6:19:48 PM", action: "SELL", asset: "ARB", value: "3.06" },
];

const LiveFeed = () => {
  const [blinkIndex, setBlinkIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkIndex((prev) => (prev + 1) % initialTrades.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel-glow panel-float p-4 reveal-up reveal-delay-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Live Execution Log
        </span>
        <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
      </div>

      <div className="space-y-0 overflow-hidden max-h-[360px]">
        {initialTrades.map((trade, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-1.5 px-2 rounded text-xs font-mono transition-colors ${
              i === blinkIndex ? "bg-panel-2" : ""
            }`}
          >
            <span className="text-muted-foreground w-24">{trade.time}</span>
            <span className={`w-10 font-semibold ${trade.action === "BUY" ? "text-primary" : "text-destructive"}`}>
              {trade.action}
            </span>
            <span className="text-foreground w-12 font-semibold">{trade.asset}</span>
            <span className="text-muted-foreground w-10 text-right">{trade.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
