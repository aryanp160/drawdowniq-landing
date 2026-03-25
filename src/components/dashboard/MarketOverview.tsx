const MarketOverview = () => {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6">
      
      {/* Bias */}
      <div className="flex-1 panel-glow p-3.5 rounded border border-border bg-panel flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Today's Global Bias</span>
          <span className="font-display font-bold text-base text-foreground uppercase tracking-wider">Bullish Flow</span>
        </div>
        <div className="w-8 h-8 rounded-full border border-green-500/20 flex items-center justify-center bg-green-500/5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Volatility */}
      <div className="flex-1 panel-glow p-3.5 rounded border border-border bg-panel flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">24H Volatility Profile</span>
          <span className="font-display font-bold text-base text-warning tracking-wider">Elevated (6.4%)</span>
        </div>
        <div className="w-8 h-8 rounded-full border border-warning/20 flex items-center justify-center bg-warning/5 text-warning">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        </div>
      </div>

      {/* Active Liquidity Nodes */}
      <div className="flex-1 panel-glow p-3.5 rounded border border-border bg-panel flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Active Setups (Network)</span>
          <span className="font-display font-bold text-base text-foreground tracking-wider">14 Nodes</span>
        </div>
        <div className="text-[10px] font-mono text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-widest">
          Scanning...
        </div>
      </div>

    </div>
  );
};

export default MarketOverview;
