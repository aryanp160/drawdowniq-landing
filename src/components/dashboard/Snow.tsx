import { useEffect, useState } from "react";

const Snow = () => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Generate 150 particles for a denser layer
    const newParticles = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 15 + 15}s`, // Slow falling (15-30s)
      animationDelay: `-${Math.random() * 30}s`, // Pre-scattered
      opacity: Math.random() * 0.20 + 0.15, // 0.15 - 0.35 opacity (more visible)
      size: `${Math.random() * 3 + 1.5}px` // 1.5px to 4.5px
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
      <style>
        {`
          @keyframes snowfall {
            0% { transform: translateY(-10vh); }
            100% { transform: translateY(110vh); }
          }
          .snow-particle {
            position: absolute;
            top: -10vh;
            background: white;
            border-radius: 50%;
            animation-name: snowfall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }
        `}
      </style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="snow-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        />
      ))}
    </div>
  );
};

export default Snow;
