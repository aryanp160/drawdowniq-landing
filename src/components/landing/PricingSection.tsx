const plans = [
  {
    name: "SIGNALS",
    price: "$17",
    highlighted: false,
  },
  {
    name: "TRADER",
    price: "$29",
    highlighted: true,
  },
];

const PricingSection = () => (
  <div className="panel-glow p-8 reveal-up reveal-delay-7">
    <div className="grid md:grid-cols-[1fr_auto_auto] gap-8 items-center">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground italic mb-3">
          SCALABLE ALPHA.
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Join the most advanced quantitative intelligence community in the world.
        </p>
        <button className="mt-5 px-6 py-2.5 bg-primary text-primary-foreground font-mono text-xs tracking-[0.2em] rounded font-semibold hover:brightness-110 transition-all">
          INITIALIZE SUBSCRIPTION
        </button>
      </div>

      <div className="flex gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-lg border px-8 py-8 flex flex-col items-center justify-center min-w-[140px] ${
              plan.highlighted
                ? "border-primary bg-primary/5"
                : "border-border bg-panel-2"
            }`}
          >
            <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground mt-2 uppercase">
              {plan.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default PricingSection;
