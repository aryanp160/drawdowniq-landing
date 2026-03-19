const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
    <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 h-14">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
          <span className="font-display font-bold text-xs text-primary-foreground">D</span>
        </div>
        <span className="font-display font-semibold text-sm tracking-tight text-foreground">
          DRAWDOWNIQ
        </span>
      </div>

      <div className="hidden md:flex items-center gap-1 bg-panel rounded-lg border border-border px-1 py-1">
        {["TERMINAL", "ALPHA", "INTELLIGENCE", "PRICING"].map((item) => (
          <button
            key={item}
            className="px-4 py-1.5 text-xs font-mono tracking-widest text-muted-foreground hover:text-foreground transition-colors rounded"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border rounded px-2.5 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          CMD + K
        </div>
        <button className="px-4 py-1.5 bg-primary text-primary-foreground font-mono text-xs tracking-widest rounded font-semibold hover:brightness-110 transition-all">
          GO LIVE
        </button>
      </div>
    </div>
  </nav>
);

export default Navbar;
