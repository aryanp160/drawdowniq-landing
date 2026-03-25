const initialInsights = [
  { id: 1, asset: "BTC", text: "Liquidity sweep detected" },
  { id: 2, asset: "ETH", text: "Volatility compression phase" },
  { id: 3, asset: "SOL", text: "Breakout probability increasing" },
  { id: 4, asset: "LINK", text: "Institutional accumulation pattern" },
];

const MarketActivityFeed = () => {
  return (
    <div className="panel-glow panel-float p-5 reveal-up reveal-delay-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-primary" />
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Market Activity Feed
        </span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {initialInsights.map((insight) => (
          <div key={insight.id} className="flex items-start gap-3 p-2.5 rounded bg-panel-2/50 border border-border/30 transition-colors hover:bg-panel-2">
            <span className="font-mono text-xs font-bold text-foreground w-8 shrink-0">{insight.asset}</span>
            <span className="text-primary text-xs mt-0.5">→</span>
            <p className="font-mono text-[11px] text-muted-foreground leading-snug">
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketActivityFeed;
