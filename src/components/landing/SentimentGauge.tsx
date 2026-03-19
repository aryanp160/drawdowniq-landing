const SentimentGauge = () => (
  <div className="panel-glow panel-float p-5 reveal-up reveal-delay-6">
    <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase block mb-4">
      Market Sentiment
    </span>

    <div className="flex items-center justify-between mb-2">
      <span className="font-mono text-xs text-destructive font-semibold">FEAR</span>
      <span className="font-mono text-xs text-primary font-semibold">GREED</span>
    </div>

    <div className="relative h-3 rounded-full overflow-hidden bg-panel-2 mb-4">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: "62%",
          background: "linear-gradient(90deg, hsl(0 100% 65%), hsl(45 100% 55%), hsl(162 100% 50%))",
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-lg"
        style={{ left: "60%" }}
      />
    </div>

    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "60/40 Bear", active: false },
        { label: "Neutral", active: true },
        { label: "20/80 Bull", active: false },
      ].map((item) => (
        <button
          key={item.label}
          className={`py-1.5 rounded font-mono text-[10px] tracking-wider transition-colors ${
            item.active
              ? "bg-primary text-primary-foreground"
              : "bg-panel-2 text-muted-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  </div>
);

export default SentimentGauge;
