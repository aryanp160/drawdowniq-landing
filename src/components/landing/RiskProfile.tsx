const RiskProfile = () => {
  const blocks = [1, 1, 1, 0.9, 0.6, 0.2, 0.1, 0.05, 0.05, 0.02];

  return (
    <div className="panel-glow panel-float p-5 reveal-up reveal-delay-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Current Risk Profile
        </span>
        <span className="font-mono text-xs font-semibold text-warning">ELEVATED</span>
      </div>

      <div className="flex gap-1.5 mb-3">
        {blocks.map((opacity, i) => (
          <div
            key={i}
            className="h-10 flex-1 rounded-sm"
            style={{
              backgroundColor: `hsl(45 100% 55% / ${opacity})`,
            }}
          />
        ))}
      </div>

      <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
        <span>0.00</span>
        <span>0.50</span>
        <span>1.00</span>
      </div>
    </div>
  );
};

export default RiskProfile;
