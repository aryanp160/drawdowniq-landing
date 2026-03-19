const checks = [
  "Real-time market signals",
  "Probability-based models",
  "Risk-adjusted market intelligence",
];

const TrustPanel = () => (
  <div className="panel-glow panel-float-delayed p-5 reveal-up reveal-delay-4">
    <span className="font-mono text-[10px] tracking-[0.2em] text-primary mb-4 block">
      // TRUSTED BY 5K+ ALPHAS
    </span>
    <div className="space-y-3">
      {checks.map((item) => (
        <div key={item} className="flex items-center gap-3">
          <span className="text-primary text-sm">✓</span>
          <span className="font-sans text-sm text-foreground">{item}</span>
        </div>
      ))}
    </div>
  </div>
);

export default TrustPanel;
