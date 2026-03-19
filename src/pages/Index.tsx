import Navbar from "@/components/landing/Navbar";
import MarketTicker from "@/components/landing/MarketTicker";
import SignalPanel from "@/components/landing/SignalPanel";
import TrustPanel from "@/components/landing/TrustPanel";
import AccuracyPanel from "@/components/landing/AccuracyPanel";
import ConfidenceGauge from "@/components/landing/ConfidenceGauge";
import VolatilityRadar from "@/components/landing/VolatilityRadar";
import LiveFeed from "@/components/landing/LiveFeed";
import RiskProfile from "@/components/landing/RiskProfile";
import SentimentGauge from "@/components/landing/SentimentGauge";
import AIReasonerPanel from "@/components/landing/AIReasonerPanel";
import PricingSection from "@/components/landing/PricingSection";
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
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-primary/30 bg-primary/5 font-mono text-[10px] tracking-[0.2em] text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
                  SECURE NODE INFRASTRUCTURE ACTIVE
                </span>
              </div>

              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold text-foreground leading-[0.9] tracking-tight reveal-up reveal-delay-2 uppercase">
                QUANTITATIVE
                <br />
                RISK
                <br />
                INTELLIGENCE
              </h1>

              <p className="mt-8 text-base text-muted-foreground max-w-lg leading-relaxed reveal-up reveal-delay-3">
                Identify high-probability long/short opportunities before the market moves. Powered by liquidity analysis and volatility models.
              </p>
              <p className="mt-3 text-xs text-muted-foreground/70 font-mono tracking-wide reveal-up reveal-delay-3">
                Built for both independent traders and advanced market participants.
              </p>
            </div>

            {/* Signal Panel - top right */}
            <div className="lg:mt-4">
              <SignalPanel />
            </div>
          </div>

          {/* Row 2: Trust + Accuracy */}
          <div className="grid md:grid-cols-2 lg:grid-cols-[1fr_1fr_380px] gap-6 mb-6">
            <TrustPanel />
            <AccuracyPanel />
            {/* Live Feed starts here and spans rows */}
            <div className="row-span-2 hidden lg:block">
              <LiveFeed />
            </div>
          </div>

          {/* Row 3: Gauge + Radar */}
          <div className="grid md:grid-cols-2 lg:grid-cols-[1fr_1.5fr] gap-6 mb-6 lg:max-w-[calc(100%-404px)]">
            <ConfidenceGauge />
            <VolatilityRadar />
          </div>

          {/* Mobile Live Feed */}
          <div className="lg:hidden mb-6">
            <LiveFeed />
          </div>

          {/* Row 4: Risk + Sentiment + AI Reasoner */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <RiskProfile />
            <SentimentGauge />
            <AIReasonerPanel />
          </div>

          {/* Row 5: Performance */}
          <div className="mb-6">
            <PerformanceSection />
          </div>

          {/* Row 6: Pricing */}
          <div className="mb-10">
            <PricingSection />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
