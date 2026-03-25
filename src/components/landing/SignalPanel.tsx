import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const SignalPanel = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (!currentUser) navigate('/login');
    else if (userProfile?.subscriptionStatus !== 'active') navigate('/pricing');
    else navigate('/terminal');
  };

  return (
  <div className="panel-glow panel-glow-accent panel-float p-5 w-full max-w-sm reveal-up reveal-delay-3">
    <div className="flex items-center justify-between mb-4">
      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Target Asset</span>
      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Execution Conf</span>
    </div>
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold text-primary">BTC</span>
        <span className="font-mono text-sm text-foreground tracking-wider">LONG</span>
      </div>
      <span className="font-display text-3xl font-bold text-primary">74%</span>
    </div>

    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="bg-panel-2 rounded px-3 py-2">
        <span className="font-mono text-[9px] tracking-[0.15em] text-muted-foreground block mb-1">RISK RATING</span>
        <span className="font-mono text-xs font-semibold text-warning">MEDIUM PROFILE</span>
      </div>
      <div className="bg-panel-2 rounded px-3 py-2">
        <span className="font-mono text-[9px] tracking-[0.15em] text-muted-foreground block mb-1">VOL COMP</span>
        <span className="font-mono text-xs font-semibold text-primary">BREAKOUT PROB</span>
      </div>
    </div>

    <div className="bg-panel-2 rounded p-4 mb-4 border-l-2 border-primary">
      <div className="flex items-center gap-2 mb-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <span className="font-mono text-[10px] tracking-[0.2em] text-primary">TECHNICAL LOGIC</span>
      </div>
      <p className="font-mono text-xs text-muted-foreground leading-relaxed">
        Liquidity cluster forming near $62,000 support. Volatility compression suggests high-probability breakout within 24–48 trading hours.
      </p>
    </div>

    <button
      onClick={handleCTA}
      className="w-full py-3 bg-primary text-primary-foreground font-mono text-xs tracking-[0.2em] rounded font-semibold hover:brightness-110 transition-all"
    >
      UNLOCK LIVE SIGNALS
    </button>
    <p className="mt-3 text-center text-[10px] text-muted-foreground/60 font-mono tracking-wide">
      Limited access — signals updated daily. New users capped each week.
    </p>
  </div>
  );
};

export default SignalPanel;
