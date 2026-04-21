import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, UserProfile } from "@/contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Snow from "@/components/dashboard/Snow";
import { motion, AnimatePresence } from "framer-motion";

const plans = [
  { name: "SIGNALS", price: "$19", period: "/mo", highlighted: false, modeLabel: "PASSIVE", supportingLine: "Setups you follow", differentiator: "Built for consistency — not signal spam.", ctaLabel: "Unlock Signals", features: ["Up to 20 high-quality trade setups weekly", "Clear LONG / SHORT direction", "Defined entry, TP & SL levels", "Market bias + context", "Weekly outlook"] },
  { name: "TRADER", price: "$29", period: "/mo", highlighted: true, modeLabel: "ACTIVE", supportingLine: "We trade together live", differentiator: "Trade with clarity, not guesswork.", ctaLabel: "Access Trading System", features: ["Everything in Signals", "Live trading sessions (1–2 hour guidance)", "Real-time entry & exit calls", "Live PnL tracking + session results", "Active decision support"] },
  { name: "ELITE", price: "$199", period: "/mo", highlighted: false, isComingSoon: true, modeLabel: "INSTITUTIONAL", supportingLine: "Full portfolio mandate", ctaLabel: "Coming Soon", features: ["Everything in Trader", "Personalized portfolio plan", "Custom risk model", "Private insights dashboard"], footerText: { title: "COMING SOON", desc: "Advanced execution models, private alpha streams, and institutional-grade portfolio intelligence." } },
];

const Pricing = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [processingState, setProcessingState] = useState<"idle" | "processing" | "success">("idle");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSubscribe = async (planName: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setSelectedPlan(planName);
    setProcessingState("processing");

    // Mock 2-3 sec payment delay
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await updateDoc(userRef, {
          plan: planName.toLowerCase() as UserProfile['plan'],
          subscriptionStatus: 'active',
          expiresAt: expiresAt
        });

        setProcessingState("success");
        setTimeout(() => {
          navigate('/terminal');
        }, 1500);
      } catch (err) {
        setProcessingState("idle");
      }
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-background noise-overlay flex flex-col relative z-0 text-foreground">
      <Snow />
      <Navbar />

      <AnimatePresence>
        {processingState !== "idle" && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              {processingState === "processing" ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                  <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-primary">
                    Processing Network Auth...
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground uppercase opacity-70">
                    Securing payment vector
                  </p>
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500 mb-2"><path d="M20 6 9 17l-5-5"/></svg>
                  <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-green-500">
                    Subscription Activated
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground uppercase animate-pulse">
                    Redirecting to terminal...
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid-bg relative z-10 flex-1 flex flex-col w-full">
        <div className="flex-1 pt-24 px-6 max-w-[1440px] mx-auto pb-10 w-full">
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h1 className="font-display text-4xl md:text-5xl font-bold uppercase mb-4 tracking-tight">
              Scalable Alpha
            </h1>
            <p className="text-base text-muted-foreground">
              Join the most advanced quantitative intelligence community in the world.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-6 flex flex-col relative ${
                  plan.highlighted ? "border-primary bg-primary/5" : "border-border bg-panel-2"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold font-mono px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
                    Most Popular
                  </div>
                )}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                        {plan.name}
                      </span>
                      {/* @ts-ignore */}
                      {plan.modeLabel && (
                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-widest ${plan.highlighted ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-panel-2 border border-border text-muted-foreground'}`}>
                          {plan.modeLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`font-display text-4xl font-bold ${plan.isComingSoon ? 'text-muted-foreground/50' : ''}`}>
                        {plan.price}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{plan.period}</span>
                    </div>
                    {/* @ts-ignore */}
                    {plan.isComingSoon && (
                      <span className="mt-2 inline-block text-[9px] text-muted-foreground/50 uppercase tracking-widest border border-border/30 bg-panel px-2 py-0.5 rounded leading-none">
                        Coming Soon
                      </span>
                    )}
                  </div>
                {/* @ts-ignore */}
                {plan.supportingLine && (
                  <div className="mb-4 pb-4 border-b border-border/50 text-center">
                    <span className={`text-[10px] tracking-widest uppercase font-mono ${plan.highlighted ? 'text-primary' : 'text-muted-foreground/80'}`}>{plan.supportingLine}</span>
                  </div>
                )}
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-xs font-mono ${(plan as any).isComingSoon ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                      <span className={`mt-0.5 ${(plan as any).isComingSoon ? 'text-muted-foreground/30' : 'text-primary'}`}>›</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {/* @ts-ignore */}
                {plan.differentiator && (
                  <div className="mb-6 p-3 rounded bg-panel border gap-2 border-primary/20 text-center">
                    <p className="text-[11px] font-mono leading-relaxed text-primary/90 font-semibold">{plan.differentiator}</p>
                  </div>
                )}
                {plan.name !== "ELITE" && (
                  <button
                    disabled={processingState !== "idle"}
                    onClick={() => handleSubscribe(plan.name)}
                    className={`w-full py-3 font-mono text-xs tracking-[0.2em] rounded font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground hover:brightness-110"
                        : "border border-border text-foreground hover:bg-panel-2"
                    }`}
                  >
                    {userProfile?.plan?.toUpperCase() === plan.name ? "CURRENT PLAN" : (plan as any).ctaLabel.toUpperCase()}
                  </button>
                )}
                {/* @ts-ignore */}
                {plan.isComingSoon ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-full py-2 rounded border border-border/40 bg-panel text-center">
                      <span className="font-mono text-[10px] text-muted-foreground/45 uppercase tracking-[0.2em]">
                        Coming Soon
                      </span>
                    </div>
                    {/* @ts-ignore */}
                    {plan.footerText && (
                      <p className="text-[9px] font-mono text-muted-foreground/35 uppercase tracking-widest text-center leading-relaxed">
                        {plan.footerText.desc}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Pricing;
