import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ClosedSignal {
  id: string;
  asset: string;
  direction: string;
  finalReturn: number;
  closedAt: string;
  status: "TP_HIT" | "SL_HIT";
}

const CACHE_KEY = "quantiq_performance_cache";

const PerformanceSection = () => {
  const [signals, setSignals] = useState<ClosedSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "signals"),
          orderBy("timestamp", "desc"),
          limit(30)
        );

        const snap = await getDocs(q);
        
        const fetched: ClosedSignal[] = snap.docs
          .map(doc => {
            const d = doc.data();
            let dateStr = new Date().toISOString();
            if (d.closedAt?.toDate) {
              dateStr = d.closedAt.toDate().toISOString();
            } else if (d.closedAt) {
              dateStr = new Date(d.closedAt).toISOString();
            }

            return {
              id: doc.id,
              asset:       d.asset,
              direction:   d.direction,
              finalReturn: typeof d.finalReturn === "number" ? d.finalReturn : null,
              closedAt:    dateStr,
              rawClosedAt: d.closedAt?.toDate ? d.closedAt.toDate().getTime() : (d.closedAt ? new Date(d.closedAt).getTime() : 0),
              status:      d.status,
            };
          })
          .filter(s => (s.status === "TP_HIT" || s.status === "SL_HIT") && s.finalReturn != null && s.rawClosedAt > 0)
          .sort((a, b) => b.rawClosedAt - a.rawClosedAt)
          .slice(0, 5) as ClosedSignal[];

        console.log("Fresh fetch success:", fetched.length);
        setSignals(fetched);
        localStorage.setItem(CACHE_KEY, JSON.stringify(fetched));
        
      } catch (err) {
        console.warn("Fetch failed, using cache", err);
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            setSignals(JSON.parse(cached));
          }
        } catch (cacheErr) {
          console.warn("Failed to parse performance cache", cacheErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  const wins    = signals.filter(s => s.status === "TP_HIT").length;
  const total   = signals.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null;
  const avgRet  = total > 0
    ? signals.reduce((sum, s) => sum + s.finalReturn, 0) / total
    : null;

  return (
    <div className="panel-glow p-6 reveal-up reveal-delay-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground">
            RECENT SIGNAL PERFORMANCE
          </h3>
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground mt-1 uppercase">
            Based on closed signals · last 5 trades
          </p>
          {avgRet != null && (
            <p className="font-mono text-[10px] tracking-[0.1em] text-primary mt-1 font-semibold">
              Avg Return: {avgRet >= 0 ? "+" : ""}{avgRet.toFixed(1)}% per signal
            </p>
          )}
        </div>
        {winRate != null && (
          <span className={`px-3 py-1 rounded border font-mono text-[10px] tracking-[0.15em] ${
            winRate >= 50
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}>
            {wins}/{total} PROFITABLE
          </span>
        )}
      </div>

      <div className="space-y-0">
        {loading ? (
          // Skeleton rows
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 px-3 border-b border-border/30 last:border-0 opacity-30">
              <div className="h-3 w-20 rounded bg-border animate-pulse" />
              <div className="h-3 w-12 rounded bg-border animate-pulse" />
              <div className="h-3 w-16 rounded bg-border animate-pulse" />
            </div>
          ))
        ) : signals.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6 font-mono tracking-widest uppercase">
            No closed signals yet
          </p>
        ) : (
          signals.map((s) => {
            const isWin  = s.status === "TP_HIT";
            const dateObj = new Date(s.closedAt);
            const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

            return (
              <div
                key={s.id}
                className="flex items-center justify-between py-2.5 px-3 rounded font-mono text-sm border-b border-border/30 last:border-0 hover:bg-panel-2 transition-colors relative overflow-hidden"
              >
                {/* Left bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isWin ? "bg-green-500/60" : "bg-destructive/60"}`} />
                <div className="flex items-center gap-4 pl-2">
                  <span className="font-semibold text-foreground w-12">{s.asset}</span>
                  <span className={`text-[10px] tracking-[0.15em] font-semibold w-14 ${
                    s.direction === "LONG" || s.direction === "BUY" ? "text-primary" : "text-destructive"
                  }`}>
                    {s.direction}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{dateStr}</span>
                <span className={`font-bold text-base tabular-nums ${isWin ? "text-green-500" : "text-destructive"}`}>
                  {s.finalReturn >= 0 ? "+" : ""}{s.finalReturn.toFixed(1)}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PerformanceSection;
