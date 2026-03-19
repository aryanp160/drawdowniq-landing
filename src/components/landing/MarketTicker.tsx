const alerts = [
  { type: "MARKET ALERT:", text: "BTC Vol Compression Detected [H4]", highlight: true },
  { type: "", text: "ETH Liquidity Outflow Identified", highlight: true },
  { type: "", text: "Sentiment Shift: NEUTRAL to BULLISH", highlight: false },
  { type: "MARKET ALERT:", text: "SOL Breakout Pattern Forming", highlight: true },
  { type: "", text: "ARB Accumulation Phase Detected", highlight: false },
  { type: "MARKET ALERT:", text: "LINK Whale Activity Surge", highlight: true },
];

const MarketTicker = () => {
  const items = [...alerts, ...alerts];

  return (
    <div className="w-full border-b border-border overflow-hidden bg-panel/50 backdrop-blur-sm">
      <div className="ticker-scroll flex items-center whitespace-nowrap py-2.5">
        {items.map((alert, i) => (
          <span key={i} className="flex items-center gap-2 mx-6 font-mono text-xs tracking-wider">
            {alert.type && (
              <span className="text-muted-foreground">{alert.type}</span>
            )}
            <span className={alert.highlight ? "text-primary" : "text-foreground"}>
              {alert.text}
            </span>
            <span className="text-muted-foreground mx-2">//</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarketTicker;
