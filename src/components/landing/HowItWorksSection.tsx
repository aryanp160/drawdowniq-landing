import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Get Access",
    desc: "Join the dashboard to unlock live signal feeds.",
  },
  {
    number: "02",
    title: "Track Setups",
    desc: "Monitor high-probability opportunities as they form.",
  },
  {
    number: "03",
    title: "Execute",
    desc: "Take action based on clear data and defined risk params.",
  },
];

const HowItWorksSection = () => (
  <div className="panel-glow p-8 reveal-up reveal-delay-8">
    <div className="mb-8">
      <h2 className="font-display text-2xl font-bold text-foreground italic mb-2">
        HOW IT WORKS
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        A systematic approach to navigating volatility.
      </p>
    </div>

    <div className="grid sm:grid-cols-3 gap-6">
      {steps.map((step) => (
        <div key={step.number} className="relative">
          <span className="font-mono text-4xl font-black text-border opacity-50 absolute -top-4 -left-2 -z-10">
            {step.number}
          </span>
          <h3 className="font-mono text-xs tracking-[0.2em] font-semibold text-foreground mb-2 mt-4 uppercase">
            {step.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {step.desc}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default HowItWorksSection;
