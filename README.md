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











Restructure Live Trading system to separate SESSION and CALL logic.

IMPORTANT:

* Reduce complexity
* Remove redundant fields
* Make system clear and focused

---

