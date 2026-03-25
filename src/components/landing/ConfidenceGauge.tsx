import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const ConfidenceGauge = () => {
  const [confidence, setConfidence] = useState(74);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const moveGauge = () => {
      setConfidence(prev => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        let next = prev + change;
        if(next < 70) next = 70;
        if(next > 80) next = 80;
        return next;
      });
      timeoutId = setTimeout(moveGauge, Math.random() * 3000 + 4000); // 4-7s
    };
    timeoutId = setTimeout(moveGauge, 4000);
    return () => clearTimeout(timeoutId);
  }, []);

  const angle = (confidence / 100) * 180 - 90;

  return (
    <div className="panel-glow panel-float-delayed p-5 reveal-up reveal-delay-4 h-full flex flex-col justify-between">
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
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            animate={{ strokeDasharray: `${(confidence / 100) * 251.2} 251.2` }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
          {/* Needle */}
          <motion.line
            x1="100"
            y1="100"
            animate={{
              x2: 100 + 55 * Math.cos((angle * Math.PI) / 180),
              y2: 100 + 55 * Math.sin((angle * Math.PI) / 180)
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
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
