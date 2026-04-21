import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "SIGNALS",
    price: "$19",
    period: "/mo",
    highlighted: false,
    planKey: "signals",
    modeLabel: "PASSIVE",
    supportingLine: "Setups you follow",
    ctaLabel: "Unlock Signals",
    differentiator: "Built for consistency — not signal spam.",
    features: [
      "Up to 20 high-quality trade setups weekly",
      "Clear LONG / SHORT direction",
      "Defined entry, TP & SL levels",
      "Market bias + context",
      "Weekly outlook"
    ],
  },
  {
    name: "TRADER",
    price: "$29",
    period: "/mo",
    highlighted: true,
    planKey: "trader",
    modeLabel: "ACTIVE",
    supportingLine: "We trade together live",
    ctaLabel: "Access Trading System",
    differentiator: "Trade with clarity, not guesswork.",
    features: [
      "Everything in Signals",
      "Live trading sessions (1–2 hour guidance)",
      "Real-time entry & exit calls",
      "Live PnL tracking + session results",
      "Active decision support"
    ],
  },
  {
    name: "ELITE",
    price: "$199",
    period: "/mo",
    highlighted: false,
    planKey: "elite",
    isComingSoon: true,
    features: [
      "Everything in Trader",
      "Personalized portfolio plan",
      "Custom risk model",
      "Private insights dashboard",
    ],
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <div className="panel-glow p-8 reveal-up reveal-delay-7">
      <div className="mb-8">
        <h2 className="font-display text-3xl font-bold text-foreground italic mb-3">
          SCALABLE ALPHA.
        </h2>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          Join the most advanced quantitative intelligence community in the world.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-lg border p-6 flex flex-col relative ${
              plan.highlighted
                ? "border-primary bg-primary/5"
                : "border-border bg-panel-2"
            } ${plan.isComingSoon ? "opacity-80" : ""}`}
          >
            {/* Most Popular badge */}
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold font-mono px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
                Most Popular
              </div>
            )}

            {/* Plan name + price */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  {plan.name}
                </span>
                {/* @ts-ignore */}
                {plan.modeLabel && (
                  <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-widest ${plan.highlighted ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-panel border border-border text-muted-foreground'}`}>
                    {plan.modeLabel}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`font-display text-4xl font-bold ${plan.isComingSoon ? "text-muted-foreground/60" : "text-foreground"}`}>
                  {plan.price}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{plan.period}</span>
              </div>
            </div>

            {/* Supporting line */}
            {plan.supportingLine && (
              <div className="mb-4 pb-3 border-b border-border/50 text-center">
                <span className={`text-[10px] tracking-widest uppercase font-mono ${plan.highlighted ? 'text-primary' : 'text-muted-foreground/80'}`}>
                  {plan.supportingLine}
                </span>
              </div>
            )}

            {/* Features */}
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className={`flex items-start gap-2 text-xs font-mono ${plan.isComingSoon ? "text-muted-foreground/40" : "text-foreground"}`}>
                  <span className={`mt-0.5 ${plan.isComingSoon ? "text-muted-foreground/40" : "text-primary"}`}>›</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Differentiator text block */}
            {/* @ts-ignore */}
            {plan.differentiator && (
              <div className="mb-6 p-3 rounded bg-panel border gap-2 border-primary/20 text-center">
                <p className="text-[11px] font-mono leading-relaxed text-primary/90 font-semibold">{plan.differentiator}</p>
              </div>
            )}

            {/* CTA */}
            {plan.isComingSoon ? (
              <div className="mt-auto flex flex-col items-center gap-2">
                {/* Coming Soon badge */}
                <div className="w-full py-2 rounded border border-border/40 bg-panel text-center">
                  <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em]">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[9px] font-mono text-muted-foreground/35 uppercase tracking-widest text-center leading-relaxed">
                  Advanced execution models, private alpha streams,<br />and institutional-grade portfolio intelligence.
                </p>
              </div>
            ) : (
              <button
                onClick={() => navigate("/pricing")}
                className={`w-full py-2.5 font-mono text-xs tracking-[0.2em] rounded font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:brightness-110"
                    : "border border-border text-foreground hover:bg-panel-2"
                }`}
              >
                {plan.ctaLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingSection;
