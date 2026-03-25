import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import MarketTicker from "@/components/landing/MarketTicker";
import SignalPanel from "@/components/landing/SignalPanel";
import SystemStatusBadge from "@/components/landing/SystemStatusBadge";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import PricingSection from "@/components/landing/PricingSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PerformanceSection from "@/components/landing/PerformanceSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background noise-overlay">
      <Navbar />

      {/* Ticker below nav */}
      <div className="pt-14">
        <MarketTicker />
      </div>

      {/* Canvas */}
      <div className="grid-bg relative">
        <div className="max-w-[1440px] mx-auto px-6 py-10">
          {/* Row 1: Hero + Signal Panel */}
          <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start mb-8">
            {/* Hero - top left */}
            <div className="pt-6">
              <div className="reveal-up reveal-delay-1 mb-6">
                <SystemStatusBadge />
              </div>

              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold text-foreground leading-[0.9] tracking-tight reveal-up reveal-delay-2 uppercase">
                QUANTITATIVE
                <br />
                RISK
                <br />
                INTELLIGENCE
              </h1>

              <p className="mt-8 text-base text-muted-foreground max-w-lg leading-relaxed reveal-up reveal-delay-3">
                Identify high-probability long/short opportunities before the market moves. Built on liquidity flows, volatility regimes, and risk modeling.
              </p>
              <p className="mt-3 text-xs text-muted-foreground/70 font-mono tracking-wide reveal-up reveal-delay-3">
                Built for both independent traders and advanced market participants.
              </p>
              <p className="mt-4 text-xs font-semibold text-foreground/80 tracking-wide reveal-up reveal-delay-4">
                Simple signals. Clear direction. No complex charts required.
              </p>
            </div>

            {/* Signal Panel - top right */}
            <div className="lg:mt-4">
              <SignalPanel />
            </div>
          </div>

          {/* Structured Dashboard Grid */}
          <div className="mb-10">
            <DashboardGrid variant="preview" isLocked={true} />
          </div>

          {/* Row 5: Performance */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-50px" }} 
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <PerformanceSection />
          </motion.div>

          {/* Row 6: Pricing */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-50px" }} 
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <PricingSection />
          </motion.div>

          {/* Row 7: How It Works & Disclaimer */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <HowItWorksSection />
            <div className="mt-8 text-center text-sm font-mono tracking-wide text-muted-foreground/60 p-4 border border-border/50 rounded-lg bg-panel-2/30">
              No hype. No guarantees. Just data-driven market intelligence.
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
