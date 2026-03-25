import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const statuses = [
  "SECURE NODE INFRASTRUCTURE ACTIVE",
  "SCANNING MARKET CONDITIONS...",
  "UPDATING SIGNAL MODELS...",
  "PROCESSING LIQUIDITY DATA...",
  "EVALUATING VOLATILITY REGIMES..."
];

const SystemStatusBadge = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const cycleStatus = () => {
      setIndex(prev => (prev + 1) % statuses.length);
      timeoutId = setTimeout(cycleStatus, Math.random() * 3000 + 5000); // 5-8s
    };
    timeoutId = setTimeout(cycleStatus, 6000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-primary/30 bg-primary/5 font-mono text-[10px] tracking-[0.2em] text-primary overflow-hidden relative h-[26px]" style={{ minWidth: '280px' }}>
      <motion.span 
        className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" 
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative h-full w-full flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center whitespace-nowrap"
          >
            {statuses[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </span>
  );
};

export default SystemStatusBadge;
