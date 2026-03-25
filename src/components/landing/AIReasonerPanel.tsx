import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const variations = [
  [
    "[SYSTEM_LOG]: Sentiment convergence detected at $64.2k support.",
    "Order flow imbalance favors LONG vectors with 82% probability.",
    "Whale accumulation cluster +4.2% in 24h."
  ],
  [
    "[SYSTEM_LOG]: Liquidity cluster forming near key resistance level.",
    "Short gamma exposure rising, potential squeeze setup detected.",
    "Institutional inflows increased by 12% across major pairs."
  ],
  [
    "[SYSTEM_LOG]: Volatility compression suggests breakout probability.",
    "Historical analogs indicate 76% chance of upward expansion.",
    "Derivatives funding rates remain neutral-to-negative."
  ],
  [
    "[SYSTEM_LOG]: Sector rotation algorithm flags DeFi momentum.",
    "Smart money accumulation identified in mid-cap protocols.",
    "Network activity metrics show clear divergence."
  ]
];

const AIReasonerPanel = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let messageTimeout: NodeJS.Timeout;
    const rotateMessage = () => {
      setActiveIndex(prev => (prev + 1) % variations.length);
      messageTimeout = setTimeout(rotateMessage, Math.random() * 4000 + 6000); // 6-10s
    };
    
    // Initial stagger
    messageTimeout = setTimeout(rotateMessage, 7000);
    return () => clearTimeout(messageTimeout);
  }, []);

  return (
  <div className="panel-glow panel-float-slow p-5 reveal-up reveal-delay-5 h-full flex flex-col justify-between">
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

    <div className="font-mono text-xs text-muted-foreground leading-relaxed space-y-1.5 h-[60px] relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <p className="text-foreground">{variations[activeIndex][0]}</p>
          <p>{variations[activeIndex][1]}</p>
          <p>{variations[activeIndex][2]}</p>
        </motion.div>
      </AnimatePresence>
    </div>

    <div className="mt-4 h-1.5 rounded-full bg-panel-2 overflow-hidden">
      <motion.div 
        className="h-full bg-primary rounded-full origin-left"
        animate={{ scaleX: [0, 1] }}
        transition={{ 
          duration: 10, 
          ease: "linear", 
          repeat: Infinity,
          repeatDelay: 0.5 
        }} 
      />
    </div>
  </div>
  );
};

export default AIReasonerPanel;
