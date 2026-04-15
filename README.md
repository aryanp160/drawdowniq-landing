# DrawdownIQ - Quantitative Risk Intelligence

This document outlines the core Firestore data structures required to operate the DrawdownIQ Terminal.

## Firebase Firestore Schemas

### 1. `users` Collection
Stores user authentication details and subscription tier logic.
```typescript
interface UserProfile {
  uid: string;
  email: string;
  plan: 'free' | 'signals' | 'trader' | 'elite';
  subscriptionStatus: 'active' | 'inactive' | 'past_due';
  expiresAt: Timestamp;
  createdAt: Timestamp;
}
```

### 2. `signals` Collection
The core trading intelligence data displayed inside the `DashboardGrid`.
```typescript
interface TradeSignal {
  id: string; // Document ID
  asset: string; // e.g. "BTC/USD"
  direction: 'LONG' | 'SHORT';
  confidence: string; // e.g. "74%"
  entryLow: number;
  entryHigh: number;
  tp: number;
  sl: number;
  leverage: number; // Execution modifier (e.g., 5)
  status: 'RUNNING' | 'TP_HIT' | 'SL_HIT'; // Execution state
  validUntil: any; // Firestore Timestamp
  timestamp: any; // Firestore Timestamp
}
```

### 3. `dailyPlans` Collection
Premium execution plans for `Trader` and `Elite` tiers. Displayed proudly at the top of the terminal.
```typescript
interface DailyPlan {
  id: string; // Document ID
  date: string; // ISO String Date
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  supportLevels: string[]; // ["$61,200", "$59,800"]
  resistanceLevels: string[]; // ["$63,500", "$65,000"]
  watchlist: string[]; // ["BTC", "SOL", "LINK"]
  riskMode: 'Low' | 'Medium' | 'High';
}
```

### Operating Instructions
1. **Real-time Engine**: The terminal UI strictly listens to these collections via `onSnapshot` queries. 
2. **Access Control**: Users must have `plan === 'trader' || plan === 'elite'` to view unblurred `dailyPlans`. 
3. **Seeding Data**: Simply creating documents matching this schema in the Firebase console will immediately reflect in the live terminal.











Upgrade the Live Trading Session system to include real trade tracking, return calculation, and historical performance.

IMPORTANT:

* Do NOT change existing schema structure (only extend)
* Keep everything real-time
* Focus on accuracy and persistence

---

# 1. EXTEND FIRESTORE (liveSession)

Update schema:

{
isActive: boolean,
startTime: Timestamp,
endTime: Timestamp,

asset: string, // e.g. "BTCUSDT"
direction: "LONG" | "SHORT",
entryPrice: number,
currentPrice: number,

finalReturn: number, // locked after session ends

sessionNote: string,
currentBias: "LONG" | "SHORT" | "NEUTRAL",

updatedAt: Timestamp
}

---



# 3. LIVE PRICE ENGINE

Frontend should:

* Fetch price every 5–10 seconds
* Update:

currentPrice

DO NOT store every tick in Firestore
→ Only store when session ends

---

# 4. RETURN CALCULATION (CORE LOGIC)

For LIVE display:

IF LONG:
return = ((currentPrice - entryPrice) / entryPrice) * 100

IF SHORT:
return = ((entryPrice - currentPrice) / entryPrice) * 100

Apply leverage:

return = return * leverage (optional if added)

Display:

+X.X% LIVE

---

# 5. SESSION END (CRITICAL)

When admin clicks [ END SESSION ]:

→ Fetch final price
→ Calculate finalReturn
→ Save in Firestore

finalReturn = calculated value
endTime = now
isActive = false

IMPORTANT:
After this:
❌ NO MORE UPDATES
✅ Return is LOCKED forever

---

# 6. TERMINAL UI (ADD THIS SECTION)

Below live session:

## LAST SESSION RESULT

Show:

Asset: BTCUSDT
Direction: LONG
Result: +12.4%
Duration: 1h 42m

Color:

Green → profit
Red → loss

---

# 7. OPTIONAL: STORE HISTORY

Create:

liveSessionHistory collection

Each session gets saved after ending

---

# 8. UX RULES

* No fake numbers
* No smoothing
* No animation tricks

This must feel REAL.

---

# FINAL GOAL

User should see:

→ You went live
→ You gave direction
→ You entered trade
→ You exited
→ You made (or lost) X%

This builds trust and credibility.
