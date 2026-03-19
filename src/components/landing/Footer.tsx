const Footer = () => (
  <footer className="border-t border-border py-5 px-6">
    <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
      <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
        DRAWDOWNIQ ENGINE V4.0.2 // (C) 2026 SECURED NETWORK
      </span>
      <div className="flex items-center gap-6">
        {["SYSTEM STATUS", "DOCUMENTATION", "API LAYER", "RISK DISCLOSURE"].map((item) => (
          <span key={item} className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            {item}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 border border-border rounded px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
        <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
          OPERATIONAL
        </span>
      </div>
    </div>
  </footer>
);

export default Footer;
