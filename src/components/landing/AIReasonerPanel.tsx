const AIReasonerPanel = () => (
  <div className="panel-glow panel-float-slow p-5 reveal-up reveal-delay-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
          <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z"/>
          <path d="M8.5 14.5A6.5 6.5 0 0 0 12 22a6.5 6.5 0 0 0 3.5-7.5"/>
          <circle cx="12" cy="8" r="1.5"/>
        </svg>
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          AI Reasoner Node [Q4]
        </span>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
        <circle cx="12" cy="12" r="3" fill="none"/>
      </svg>
    </div>

    <div className="font-mono text-xs text-muted-foreground leading-relaxed space-y-1.5">
      <p className="text-foreground">
        [SYSTEM_LOG]: Sentiment convergence detected at $64.2k support.
      </p>
      <p>
        Order flow imbalance favors LONG vectors with 82% probability.
      </p>
      <p>
        Whale accumulation cluster +4.2% in 24h.
      </p>
    </div>

    <div className="mt-4 h-1.5 rounded-full bg-panel-2 overflow-hidden">
      <div className="h-full bg-primary rounded-full" style={{ width: "72%" }} />
    </div>
  </div>
);

export default AIReasonerPanel;
