const VolatilityRadar = () => {
  const points = [
    { x: 80, y: 30 }, { x: 150, y: 55 }, { x: 170, y: 90 },
    { x: 130, y: 130 }, { x: 60, y: 110 }, { x: 40, y: 70 },
  ];
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="panel-glow panel-float-slow p-5 reveal-up reveal-delay-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Volatility Radar
        </span>
      </div>

      <div className="flex justify-center">
        <svg viewBox="0 0 200 160" width="100%" height="140" className="opacity-90">
          {/* Grid hexagons */}
          {[80, 55, 30].map((r, i) => (
            <polygon
              key={i}
              points={Array.from({ length: 6 }, (_, j) => {
                const a = (Math.PI / 3) * j - Math.PI / 2;
                return `${100 + r * Math.cos(a)},${80 + r * Math.sin(a)}`;
              }).join(' ')}
              fill="none"
              stroke="hsl(222 30% 16%)"
              strokeWidth="0.5"
            />
          ))}
          {/* Data shape */}
          <polygon
            points={polygonPoints}
            fill="hsl(162 100% 50% / 0.08)"
            stroke="hsl(162 100% 50% / 0.5)"
            strokeWidth="1.5"
          />
          {/* Data dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(162 100% 50%)" className={i % 2 === 0 ? "pulse-dot" : ""} />
          ))}
          {/* Scan line */}
          <line x1="100" y1="0" x2="100" y2="160" stroke="hsl(162 100% 50% / 0.1)" strokeWidth="1" className="scan-line" />
        </svg>
      </div>

      <p className="font-mono text-[10px] text-primary tracking-wider text-right mt-2">
        SCANNING CLUSTERS...
      </p>
    </div>
  );
};

export default VolatilityRadar;
