const signals = [
  { asset: "BTC", direction: "LONG", result: "+6.2%", date: "Mar 14", status: "closed" },
  { asset: "SOL", direction: "SHORT", result: "+4.8%", date: "Mar 12", status: "closed" },
  { asset: "LINK", direction: "LONG", result: "+3.1%", date: "Mar 10", status: "closed" },
  { asset: "ETH", direction: "LONG", result: "+2.7%", date: "Mar 8", status: "closed" },
  { asset: "ARB", direction: "SHORT", result: "+5.4%", date: "Mar 6", status: "closed" },
];

const PerformanceSection = () => (
  <div className="panel-glow p-6 reveal-up reveal-delay-6">
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="font-display text-xl font-bold text-foreground">
          RECENT SIGNAL PERFORMANCE
        </h3>
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground mt-1 uppercase">
          Last 14 days • Verified Outcomes
        </p>
      </div>
      <span className="px-3 py-1 rounded border border-primary/30 bg-primary/5 font-mono text-[10px] tracking-[0.15em] text-primary">
        5/5 PROFITABLE
      </span>
    </div>

    <div className="space-y-0">
      {signals.map((s, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-3 px-3 rounded font-mono text-sm border-b border-border/30 last:border-0 hover:bg-panel-2 transition-colors"
        >
          <div className="flex items-center gap-4">
            <span className="font-semibold text-foreground w-12">{s.asset}</span>
            <span
              className={`text-[10px] tracking-[0.15em] font-semibold w-14 ${
                s.direction === "LONG" ? "text-primary" : "text-destructive"
              }`}
            >
              {s.direction}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{s.date}</span>
          <span className="font-bold text-primary text-base">{s.result}</span>
        </div>
      ))}
    </div>
  </div>
);

export default PerformanceSection;
