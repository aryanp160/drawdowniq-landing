import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ClosedSignal {
  id: string;
  asset: string;
  direction: string;
  finalReturn: number;
  closedAt: any;
  status: "TP_HIT" | "SL_HIT";
}

const PerformanceSection = () => {
  const [signals, setSignals] = useState<ClosedSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query only closed trades that have a stored finalReturn
    const q = query(
      collection(db, "signals"),
      where("status", "in", ["TP_HIT", "SL_HIT"]),
      orderBy("closedAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched: ClosedSignal[] = snap.docs
        .map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            asset:       d.asset,
            direction:   d.direction,
            finalReturn: typeof d.finalReturn === "number" ? d.finalReturn : null,
            closedAt:    d.closedAt,
            status:      d.status,
          };
        })
        .filter(s => s.finalReturn != null) as ClosedSignal[];
      setSignals(fetched);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
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
            const dateObj = s.closedAt?.toDate ? s.closedAt.toDate() : new Date();
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
