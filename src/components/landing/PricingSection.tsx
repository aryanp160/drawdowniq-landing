import { toast } from "sonner";

const plans = [
  {
    name: "SIGNALS",
    price: "$17",
    period: "/mo",
    highlighted: false,
    features: [
      "5–10 weekly high-probability signals",
      "Market direction bias",
      "Risk level indicators",
      "Weekly market outlook",
    ],
  },
  {
    name: "TRADER",
    price: "$29",
    period: "/mo",
    highlighted: true,
    features: [
      "Everything in Signals",
      "Daily trade setups",
      "Entry & exit zones",
      "Volatility + liquidity analysis",
    ],
  },
  {
    name: "ELITE",
    price: "$199",
    period: "/mo",
    highlighted: false,
    features: [
      "Everything in Trader",
      "Personalized portfolio plan",
      "Custom risk model",
      "Private insights dashboard",
    ],
  },
];

const PricingSection = () => (
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
          }`}
        >
          {plan.highlighted && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold font-mono px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
              Most Popular
            </div>
          )}
          <div className="mb-4">
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              {plan.name}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
              <span className="font-mono text-xs text-muted-foreground">{plan.period}</span>
            </div>
          </div>
          <ul className="space-y-2 mb-6 flex-1">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground font-mono">
                <span className="text-primary mt-0.5">›</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => toast.success("Redirecting to secure checkout...")}
            className={`w-full py-2.5 font-mono text-xs tracking-[0.2em] rounded font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              plan.highlighted
                ? "bg-primary text-primary-foreground hover:brightness-110"
                : "border border-border text-foreground hover:bg-panel-2"
            }`}
          >
            UNLOCK LIVE SIGNALS
          </button>
        </div>
      ))}
    </div>
  </div>
);

export default PricingSection;
