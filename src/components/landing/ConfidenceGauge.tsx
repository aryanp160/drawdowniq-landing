const ConfidenceGauge = () => {
  const confidence = 74;
  const angle = (confidence / 100) * 180 - 90;

  return (
    <div className="panel-glow panel-float-delayed p-5 reveal-up reveal-delay-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Confidence Score
        </span>
        <span className="font-mono text-sm font-semibold text-primary">{confidence}%</span>
      </div>

      <div className="flex justify-center py-4">
        <svg viewBox="0 0 200 120" width="200" height="120">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="hsl(222 30% 16%)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(confidence / 100) * 251.2} 251.2`}
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 55 * Math.cos((angle * Math.PI) / 180)}
            y2={100 + 55 * Math.sin((angle * Math.PI) / 180)}
            stroke="hsl(162 100% 50%)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="4" fill="hsl(162 100% 50%)" />
          <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(0 100% 65%)" />
              <stop offset="50%" stopColor="hsl(45 100% 55%)" />
              <stop offset="100%" stopColor="hsl(162 100% 50%)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
          Current Risk Profile
        </span>
        <span className="font-mono text-xs font-semibold text-warning">ELEVATED</span>
      </div>
    </div>
  );
};

export default ConfidenceGauge;
