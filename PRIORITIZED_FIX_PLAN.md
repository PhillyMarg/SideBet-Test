# SideBet Performance Fix Plan - Prioritized

**Goal:** Reduce Firebase reads by 90%, improve mobile UX, and enhance code quality

---

## Priority 1: High Impact, Quick Wins (Do First)

These fixes provide the biggest improvement with reasonable effort. **Target: Complete within 1-2 days**

---

### P1.1: Add Viewport Meta Tag (CRITICAL)
**Impact:** 🔴 CRITICAL - Fixes broken mobile rendering
**Effort:** ⏱️ 5 minutes
**Files:** `src/components/PWAHead.tsx`

**Current Issue:** No viewport tag = mobile browsers render at desktop width

**Fix:**
```typescript
// In src/components/PWAHead.tsx, add to metas array:
const metas = [
  { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  // ... rest of metas
];
```

**Test:** Open app on mobile device, verify it renders at proper width

---

### P1.2: Add Query Limits to All Firebase Queries
**Impact:** 🔴 CRITICAL - Reduces Firebase reads by ~70%
**Effort:** ⏱️ 30 minutes
**Files:** Multiple files with Firestore queries

**Current Issue:** Fetching entire collections without limits

**Fix:** Add `.limit(50)` to all queries:

```typescript
// src/app/home/page.tsx:106-112
const betsCreatedQuery = query(
  collection(db, "bets"),
  where("creatorId", "==", uid),
  limit(50)  // ← ADD THIS
);

const betsJoinedQuery = query(
  collection(db, "bets"),
  where("participants", "array-contains", uid),
  limit(50)  // ← ADD THIS
);
```

**Apply to:**
- `src/app/home/page.tsx:95` (groups query)
- `src/app/home/page.tsx:106, 110` (bets queries)
- `src/app/groups/[groupId]/page.tsx:150, 166, 177` (all queries)
- `src/app/groups/page.tsx:68` (bets count query)
- `src/components/Header.tsx:38` (groups query)

**Test:** Verify bets and groups still load, check Firebase console for read count

---

### P1.3: Fix Countdown Timer Re-renders
**Impact:** 🔴 CRITICAL - Eliminates 60 re-renders per minute
**Effort:** ⏱️ 1 hour
**Files:** `src/app/home/page.tsx`, `src/app/groups/[groupId]/page.tsx`

**Current Issue:** `setInterval` forces entire page to re-render every second

**Fix Option 1 (Simple):** Only update if there are active bets with closing times
```typescript
// src/app/home/page.tsx:76-79
useEffect(() => {
  const hasActiveCountdowns = activeBets.some(bet => !getTimeRemaining(bet.closingAt).isClosed);

  if (!hasActiveCountdowns) return; // Don't update if no active countdowns

  const timer = setInterval(() => forceUpdate((n) => n + 1), 1000);
  return () => clearInterval(timer);
}, [activeBets]);
```

**Fix Option 2 (Better):** Create a CountdownContext
```typescript
// src/context/CountdownContext.tsx (new file)
const CountdownContext = createContext(0);

export function CountdownProvider({ children }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return <CountdownContext.Provider value={tick}>{children}</CountdownContext.Provider>;
}

// In ActiveBetCard.tsx, use the context instead of prop
const tick = useContext(CountdownContext);
```

**Test:** Verify countdowns still update, check that other components don't re-render

---

### P1.4: Lazy Load Wizard Components
**Impact:** 🔴 HIGH - Reduces initial bundle by ~70KB
**Effort:** ⏱️ 20 minutes
**Files:** `src/app/home/page.tsx`, `src/components/Header.tsx`

**Current Issue:** Large wizard components loaded upfront

**Fix:**
```typescript
// At top of src/app/home/page.tsx
import { lazy, Suspense } from 'react';

const CreateBetWizard = lazy(() => import('../../components/CreateBetWizard'));
const CreateGroupWizard = lazy(() => import('../../components/CreateGroupWizard'));
const OnboardingWizard = lazy(() => import('../../components/OnboardingWizard'));

// In render, wrap with Suspense:
{showCreateBet && (
  <Suspense fallback={null}>
    <CreateBetWizard
      isOpen={showCreateBet}
      onClose={() => setShowCreateBet(false)}
      groups={groups}
      onCreateBet={handleCreateBet}
    />
  </Suspense>
)}

// Repeat for other wizards
```

**Apply to:** Same pattern in `src/components/Header.tsx`

**Test:**
- Verify wizards still open and work correctly
- Check bundle size in `npm run build` output
- Test that modals open smoothly

---

### P1.5: Fix N+1 Query on Groups Page
**Impact:** 🔴 HIGH - Reduces reads from 200+ to ~30
**Effort:** ⏱️ 30 minutes
**File:** `src/app/groups/page.tsx:67-82`

**Current Issue:** Separate query for each group's bet count

**Fix:** Add limit to each bet query:
```typescript
// src/app/groups/page.tsx:67-82
const activeBetsPromises = groupsData.map(async (group) => {
  const betsQuery = query(
    collection(db, "bets"),
    where("groupId", "==", group.id),
    limit(10)  // ← ADD THIS - only need count, not all bets
  );
  const betsSnap = await getDocs(betsQuery);
  const activeBetsCount = betsSnap.docs.filter(
    (doc) => doc.data().status !== "JUDGED"
  ).length;
  return { groupId: group.id, count: activeBetsCount };
});
```

**Better Long-term Fix:** Denormalize active bet count in group document (see P2)

**Test:** Verify groups page loads, active bet counts display correctly

---

### P1.6: Memoize ActiveBetCard Component
**Impact:** 🟡 HIGH - Prevents unnecessary re-renders
**Effort:** ⏱️ 5 minutes
**File:** `src/components/ActiveBetCard.tsx`

**Current Issue:** Re-renders every second even if props haven't changed

**Fix:**
```typescript
// At bottom of src/components/ActiveBetCard.tsx
export default React.memo(ActiveBetCard);
```

**Also apply to:**
- `src/components/ArchivedBetCard.tsx`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/components/BetCardSkeleton.tsx`
- `src/components/GroupCardSkeleton.tsx`

**Test:** Use React DevTools Profiler to verify reduced re-renders

---

### P1.7: Debounce Footer Scroll Listener
**Impact:** 🟡 MEDIUM - Improves scroll performance
**Effort:** ⏱️ 15 minutes
**File:** `src/components/Footer.tsx:14-34`

**Current Issue:** Updates state on every scroll event (60+ times per second)

**Fix:**
```typescript
// src/components/Footer.tsx
useEffect(() => {
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        if (currentScrollY < 10) {
          setIsVisible(true);
        } else if (currentScrollY > lastScrollY) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }

        setLastScrollY(currentScrollY);
        ticking = false;
      });

      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, [lastScrollY]);
```

**Test:** Scroll on mobile device, verify smooth performance

---

### P1.8: Increase Touch Target Sizes
**Impact:** 🟡 HIGH - Improves mobile usability
**Effort:** ⏱️ 30 minutes
**Files:** Multiple component files

**Current Issue:** Many buttons smaller than 44x44px minimum

**Fix:**

**Footer navigation:**
```typescript
// src/components/Footer.tsx:50-58
<button className="flex flex-col items-center justify-center min-w-[64px] min-h-[56px] transition-colors">
  <Home size={24} className="sm:w-6 sm:h-6" strokeWidth={2} />
  <span className="text-xs sm:text-sm mt-1.5 font-medium">Home</span>
</button>
```

**Header buttons:**
```typescript
// src/components/Header.tsx:285-291
<button className="flex-1 px-4 py-3 text-sm font-semibold bg-orange-500 text-white rounded-lg min-h-[44px]">
  Create Bet
</button>
```

**Bet card action buttons:**
```typescript
// src/components/ActiveBetCard.tsx:272-276
<button className="flex-1 py-3 rounded-lg text-xs font-semibold min-h-[44px]">
  <span className="leading-none">Yes</span>
</button>
```

**Test:** Tap all interactive elements on mobile, verify easy to hit

---

### P1 Summary

| Task | Impact | Effort | Expected Result |
|------|--------|--------|-----------------|
| Add viewport tag | CRITICAL | 5 min | Fix mobile rendering |
| Add query limits | CRITICAL | 30 min | -70% Firebase reads |
| Fix countdown timer | CRITICAL | 1 hour | -95% re-renders |
| Lazy load wizards | HIGH | 20 min | -70KB bundle size |
| Fix N+1 queries | HIGH | 30 min | -85% reads on groups page |
| Memoize components | HIGH | 15 min | -50% unnecessary re-renders |
| Debounce scroll | MEDIUM | 15 min | Smooth scrolling |
| Touch targets | HIGH | 30 min | Better mobile UX |

**Total Effort:** ~4 hours
**Total Impact:** 80-90% of performance gains

---

## Priority 2: Medium Impact, Moderate Effort (Do Next)

These improve UX and maintainability. **Target: Complete within 3-5 days**

---

### P2.1: Implement Toast Notifications
**Impact:** 🟡 HIGH - Better UX
**Effort:** ⏱️ 1 hour
**Files:** All files using alert()

**Install library:**
```bash
npm install sonner
```

**Setup:**
```typescript
// src/app/layout.tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PWAHead />
        {children}
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
```

**Replace all alert() calls:**
```typescript
// Before:
alert("✅ Group created successfully!");

// After:
import { toast } from 'sonner';
toast.success("Group created successfully!");
```

**23+ replacements needed in:**
- `src/app/home/page.tsx`
- `src/components/Header.tsx`
- `src/components/JudgeBetModal.tsx`
- `src/components/CreateBetWizard.tsx`
- `src/components/CreateGroupWizard.tsx`

**Test:** Verify all user feedback messages display as toasts

---

### P2.2: Add useCallback to Event Handlers
**Impact:** 🟡 MEDIUM - Prevents re-renders
**Effort:** ⏱️ 1 hour
**Files:** Multiple page files

**Fix pattern:**
```typescript
// src/app/home/page.tsx:220-254
const handleUserPick = useCallback(async (bet: any, pick: string | number) => {
  if (!user) return;
  const uid = user.uid;

  try {
    const updatedPicks = { ...bet.picks, [uid]: pick };
    const updatedParticipants = Array.from(
      new Set([...(bet.participants || []), uid])
    );

    const betRef = doc(db, "bets", bet.id);
    await updateDoc(betRef, {
      picks: updatedPicks,
      participants: updatedParticipants,
      updatedAt: new Date().toISOString(),
    });

    setBets((prev) =>
      prev.map((b) =>
        b.id === bet.id
          ? {
              ...b,
              picks: updatedPicks,
              participants: updatedParticipants,
              userPick: pick,
            }
          : b
      )
    );
  } catch (err) {
    console.error("Error updating bet pick:", err);
    toast.error("Failed to place bet. Please try again.");
  }
}, [user, setBets]); // ← Add dependencies

// Apply same pattern to:
const handleCreateBet = useCallback(async (betData: any) => { ... }, [user, setBets]);
const handleCreateGroup = useCallback(async (groupData: any) => { ... }, [user]);
```

**Apply to all handlers in:**
- `src/app/home/page.tsx`
- `src/app/groups/[groupId]/page.tsx`
- `src/components/Header.tsx`

**Test:** Use React DevTools to verify handlers don't change on re-render

---

### P2.3: Add useMemo for Expensive Calculations
**Impact:** 🟡 MEDIUM - Optimizes renders
**Effort:** ⏱️ 45 minutes
**Files:** Multiple component files

**Fix examples:**

```typescript
// src/app/home/page.tsx:291
const activeBets = useMemo(
  () => bets.filter((bet) => bet.status !== "JUDGED"),
  [bets]
);

// src/app/home/page.tsx:293-294
const groupNameMap = useMemo(
  () => new Map(groups.map(g => [g.id, g.name])),
  [groups]
);

const getGroupName = useCallback(
  (groupId: string) => groupNameMap.get(groupId) || "Unknown Group",
  [groupNameMap]
);

// src/app/groups/[groupId]/page.tsx:225-226
const activeBets = useMemo(
  () => bets.filter((b) => b.status !== "JUDGED"),
  [bets]
);

const archivedBets = useMemo(
  () => bets.filter((b) => b.status === "JUDGED"),
  [bets]
);
```

**Test:** Verify filtered lists still work correctly

---

### P2.4: Create TypeScript Interfaces
**Impact:** 🟡 MEDIUM - Type safety
**Effort:** ⏱️ 2 hours
**Files:** Create new `src/types/` directory

**Create `src/types/index.ts`:**
```typescript
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  onboardingCompleted?: boolean;
}

export interface Group {
  id: string;
  name: string;
  tagline: string;
  admin_id: string;
  memberIds: string[];
  settings: GroupSettings;
  inviteType: 'link' | 'code' | 'both';
  joinLink: string;
  accessCode: string;
  created_at: string;
}

export interface GroupSettings {
  min_bet: number;
  max_bet: number;
  starting_balance: number;
  season_enabled: boolean;
  season_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom' | 'never' | 'none';
  season_end_date: string | null;
  auto_renew: boolean;
}

export type BetType = 'YES_NO' | 'OVER_UNDER' | 'CLOSEST_GUESS';
export type BetStatus = 'OPEN' | 'CLOSED' | 'JUDGED';

export interface Bet {
  id: string;
  title: string;
  description: string;
  type: BetType;
  status: BetStatus;
  line: number | null;
  perUserWager: number;
  participants: string[];
  picks: Record<string, string | number>;
  creatorId: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  closingAt: string;
}

export interface BetData {
  type: BetType;
  groupId: string;
  title: string;
  description: string;
  wager: string;
  line: string;
  closingAt: string;
}

export interface Leaderboard {
  id: string;
  user_id: string;
  group_id: string;
  balance: number;
  wins: number;
  losses: number;
  total_wagered: number;
}
```

**Replace all `any` types:**
```typescript
// Before:
const [bets, setBets] = useState<any[]>([]);

// After:
import { Bet } from '../types';
const [bets, setBets] = useState<Bet[]>([]);
```

**Test:** Run `npm run build` and fix any type errors

---

### P2.5: Create Constants File
**Impact:** 🟡 MEDIUM - Maintainability
**Effort:** ⏱️ 30 minutes
**Files:** Create `src/lib/constants.ts`

**Create `src/lib/constants.ts`:**
```typescript
// Firestore Collections
export const COLLECTIONS = {
  BETS: 'bets',
  GROUPS: 'groups',
  USERS: 'users',
  LEADERBOARDS: 'leaderboards',
} as const;

// Bet Statuses
export const BET_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  JUDGED: 'JUDGED',
} as const;

// Bet Types
export const BET_TYPE = {
  YES_NO: 'YES_NO',
  OVER_UNDER: 'OVER_UNDER',
  CLOSEST_GUESS: 'CLOSEST_GUESS',
} as const;

// Picks
export const PICK = {
  YES: 'YES',
  NO: 'NO',
  OVER: 'OVER',
  UNDER: 'UNDER',
} as const;

// Time Constants
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = MS_PER_SECOND * 60;
export const MS_PER_HOUR = MS_PER_MINUTE * 60;
export const MS_PER_DAY = MS_PER_HOUR * 24;

// Season Durations
export const SEASON_DURATION_MS = {
  daily: MS_PER_DAY,
  weekly: 7 * MS_PER_DAY,
  monthly: 31 * MS_PER_DAY,
  quarterly: 90 * MS_PER_DAY,
} as const;

// UI Constants
export const MIN_TOUCH_TARGET_SIZE = 44; // pixels
export const DEFAULT_QUERY_LIMIT = 50;
export const CACHE_DURATION_MS = 5 * MS_PER_MINUTE;

// Environment
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://side-bet-test.vercel.app';
```

**Replace all hard-coded strings:**
```typescript
// Before:
collection(db, "bets")

// After:
import { COLLECTIONS } from '../lib/constants';
collection(db, COLLECTIONS.BETS)
```

**Test:** Verify app still works after replacements

---

### P2.6: Combine Bet Listeners on Home Page
**Impact:** 🟡 MEDIUM - Reduces Firebase reads
**Effort:** ⏱️ 1 hour
**File:** `src/app/home/page.tsx:106-135`

**Current Issue:** Two separate listeners for created and joined bets

**Fix Option 1 (Client-side merge):**
```typescript
// Fetch both query results once, merge client-side
const [betsCreatedSnap, betsJoinedSnap] = await Promise.all([
  getDocs(query(collection(db, "bets"), where("creatorId", "==", uid), limit(50))),
  getDocs(query(collection(db, "bets"), where("participants", "array-contains", uid), limit(50)))
]);

const allBets = new Map();
[...betsCreatedSnap.docs, ...betsJoinedSnap.docs].forEach(doc => {
  allBets.set(doc.id, { id: doc.id, ...doc.data() });
});
setBets(Array.from(allBets.values()));
```

**Fix Option 2 (Better, requires Firestore index):**
```typescript
// Use OR query (Firebase v9+)
import { or } from 'firebase/firestore';

const betsQuery = query(
  collection(db, "bets"),
  or(
    where("creatorId", "==", uid),
    where("participants", "array-contains", uid)
  ),
  limit(50)
);

const unsubBets = onSnapshot(betsQuery, (snapshot) => {
  const betsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  setBets(betsData);
});
```

**Note:** Option 2 may require creating a composite index in Firebase

**Test:** Verify all user's bets (created and joined) still appear

---

### P2.7: Add inputMode to All Inputs
**Impact:** 🟡 MEDIUM - Mobile UX
**Effort:** ⏱️ 30 minutes
**Files:** All files with input elements

**Fix examples:**
```typescript
// Number inputs (wager, line, guess)
<input
  type="text"
  inputMode="decimal"
  pattern="[0-9.]*"
  placeholder="10.00"
/>

// Email inputs
<input
  type="email"
  inputMode="email"
  autoComplete="email"
  placeholder="Email"
/>

// Name inputs
<input
  type="text"
  inputMode="text"
  autoComplete="given-name"
  placeholder="First Name"
/>
```

**Apply to:**
- `src/app/signup/page.tsx` (all inputs)
- `src/app/login/page.tsx` (all inputs)
- `src/components/CreateBetWizard.tsx` (wager, line inputs)
- `src/components/ActiveBetCard.tsx` (guess input)

**Test:** Open on mobile device, verify appropriate keyboards appear

---

### P2.8: Increase Input Font Sizes
**Impact:** 🟡 MEDIUM - Prevents iOS zoom
**Effort:** ⏱️ 20 minutes
**Files:** All form pages

**Fix:**
```typescript
// Before:
<input className="... text-sm ..." />  // 14px

// After:
<input className="... text-base ..." />  // 16px
```

**Apply to all inputs in:**
- `src/app/signup/page.tsx`
- `src/app/login/page.tsx`
- `src/app/settings/page.tsx`

**Test:** Tap inputs on iOS Safari, verify no auto-zoom

---

### P2.9: Add Proper Labels to All Inputs
**Impact:** 🟡 MEDIUM - Accessibility
**Effort:** ⏱️ 1 hour
**Files:** Multiple component files

**Fix pattern:**
```typescript
// Before:
<input type="text" placeholder="Enter guess..." id={`guess-${bet.id}`} />

// After:
<label htmlFor={`guess-${bet.id}`} className="sr-only">
  Enter your guess
</label>
<input type="text" placeholder="Enter guess..." id={`guess-${bet.id}`} />
```

**Add screen-reader only class to globals.css:**
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Apply to 11+ inputs across files**

**Test:** Use screen reader to verify labels are announced

---

### P2.10: Add ARIA Attributes to Modals
**Impact:** 🟡 MEDIUM - Accessibility
**Effort:** ⏱️ 45 minutes
**Files:** All modal components

**Fix pattern:**
```typescript
// src/components/JudgeBetModal.tsx
<div
  className="fixed inset-0 ... z-[200]"
  onClick={onClose}
  role="dialog"
  aria-modal="true"
  aria-labelledby="judge-bet-title"
  onKeyDown={(e) => {
    if (e.key === 'Escape') onClose();
  }}
>
  <div onClick={(e) => e.stopPropagation()}>
    <h3 id="judge-bet-title">Judge Bet</h3>
    <button
      onClick={onClose}
      aria-label="Close dialog"
    >
      <X />
    </button>
    {/* ... rest of modal */}
  </div>
</div>
```

**Apply to:**
- `src/components/JudgeBetModal.tsx`
- `src/components/CreateBetWizard.tsx`
- `src/components/CreateGroupWizard.tsx`
- `src/components/OnboardingWizard.tsx`
- Join Group modal in `src/app/home/page.tsx`

**Test:** Use keyboard (Tab, Escape) and screen reader to navigate modals

---

### P2 Summary

| Task | Impact | Effort | Expected Result |
|------|--------|--------|-----------------|
| Toast notifications | HIGH | 1 hour | Better UX, no blocking alerts |
| useCallback handlers | MEDIUM | 1 hour | Fewer re-renders |
| useMemo calculations | MEDIUM | 45 min | Optimized renders |
| TypeScript interfaces | MEDIUM | 2 hours | Type safety |
| Constants file | MEDIUM | 30 min | Easier maintenance |
| Combine bet listeners | MEDIUM | 1 hour | -50% Firebase reads |
| Input optimizations | MEDIUM | 1.5 hours | Better mobile UX |
| Accessibility fixes | MEDIUM | 2 hours | WCAG compliance |

**Total Effort:** ~10 hours
**Total Impact:** Better UX, maintainability, and accessibility

---

## Priority 3: Low Impact, Nice to Have (Do Later)

These are polish and long-term improvements. **Target: Complete within 1-2 weeks**

---

### P3.1: Denormalize Active Bet Count in Groups
**Impact:** 🟢 LOW - Eliminates N+1 queries
**Effort:** ⏱️ 2 hours
**Files:** Multiple

**Setup:** Add `activeBetCount` field to group documents

**Update on bet create:**
```typescript
// When creating a bet, increment group's activeBetCount
const groupRef = doc(db, "groups", betData.groupId);
await updateDoc(groupRef, {
  activeBetCount: increment(1)
});
```

**Update on bet judge:**
```typescript
// When judging a bet, decrement group's activeBetCount
const groupRef = doc(db, "groups", bet.groupId);
await updateDoc(groupRef, {
  activeBetCount: increment(-1)
});
```

**Use in groups list:**
```typescript
// No more separate queries needed
<span>{group.activeBetCount ?? 0} Active Bets</span>
```

**Migration:** Run script to set initial counts for existing groups

**Test:** Create/judge bets, verify counts update correctly

---

### P3.2: Implement Virtual Scrolling for Large Lists
**Impact:** 🟢 LOW - Optimizes large lists
**Effort:** ⏱️ 3 hours
**Files:** Pages with long lists

**Install:**
```bash
npm install react-window
```

**Use for archived bets:**
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={archivedBets.length}
  itemSize={100}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ArchivedBetCard bet={archivedBets[index]} />
    </div>
  )}
</FixedSizeList>
```

**Only implement if lists exceed 50+ items regularly**

---

### P3.3: Add Service Worker for Offline Support
**Impact:** 🟢 LOW - PWA enhancement
**Effort:** ⏱️ 4 hours

**Use Next.js PWA plugin:**
```bash
npm install next-pwa
```

**Configure `next.config.mjs`:**
```javascript
import withPWA from 'next-pwa';

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
})({
  // ... existing config
});
```

**Test:** Go offline, verify app still loads cached data

---

### P3.4: Add Loading States with Skeleton Screens
**Impact:** 🟢 LOW - Perceived performance
**Effort:** ⏱️ 2 hours

**Already partially implemented** - Enhance existing skeletons

**Add to more places:**
- Header during group fetch
- Settings page during user data load
- Modal content during async operations

---

### P3.5: Optimize Tailwind CSS Purging
**Impact:** 🟢 LOW - Smaller bundle
**Effort:** ⏱️ 30 minutes

**Verify `tailwind.config.js` is properly configured:**
```javascript
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // ... rest of config
}
```

**Check build output for CSS size**

---

### P3.6: Implement Focus Trapping in Modals
**Impact:** 🟢 LOW - Accessibility polish
**Effort:** ⏱️ 2 hours

**Use focus-trap-react:**
```bash
npm install focus-trap-react
```

**Wrap modals:**
```typescript
import FocusTrap from 'focus-trap-react';

<FocusTrap>
  <div role="dialog" aria-modal="true">
    {/* modal content */}
  </div>
</FocusTrap>
```

---

### P3.7: Add Analytics and Performance Monitoring
**Impact:** 🟢 LOW - Insights
**Effort:** ⏱️ 1 hour

**Already have Firebase Analytics initialized**

**Add performance tracking:**
```typescript
import { getPerformance } from 'firebase/performance';

const perf = getPerformance(app);
```

**Track custom metrics:**
```typescript
const trace = perf.trace('bet_creation');
trace.start();
// ... create bet
trace.stop();
```

---

### P3.8: Implement Error Boundaries
**Impact:** 🟢 LOW - Error handling
**Effort:** ⏱️ 1 hour

**Create `src/components/ErrorBoundary.tsx`:**
```typescript
'use client';

import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="bg-orange-500 px-6 py-2 rounded-lg"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Wrap app in layout:**
```typescript
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

---

### P3.9: Add Image Optimization
**Impact:** 🟢 LOW - Performance
**Effort:** ⏱️ 30 minutes

**Use Next.js Image component:**
```typescript
import Image from 'next/image';

// Replace img tags with:
<Image
  src="/icon-192.png"
  alt="SideBet logo"
  width={192}
  height={192}
/>
```

**Only needed if you add user avatars or bet images**

---

### P3.10: Create Custom Hooks for Reusable Logic
**Impact:** 🟢 LOW - Code organization
**Effort:** ⏱️ 2 hours

**Examples:**

**`src/hooks/useCountdown.ts`:**
```typescript
export function useCountdown(closingAt: string) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(closingAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining(closingAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [closingAt]);

  return timeRemaining;
}
```

**`src/hooks/useFirestoreQuery.ts`:**
```typescript
export function useFirestoreQuery<T>(queryFn: () => Query) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      queryFn(),
      (snapshot) => {
        setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T)));
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data, loading, error };
}
```

---

### P3 Summary

| Task | Impact | Effort | When to Do |
|------|--------|--------|------------|
| Denormalize counts | LOW | 2 hours | After P1/P2 |
| Virtual scrolling | LOW | 3 hours | If lists grow large |
| Service worker | LOW | 4 hours | PWA polish |
| Skeleton screens | LOW | 2 hours | User feedback |
| Tailwind optimization | LOW | 30 min | Build optimization |
| Focus trapping | LOW | 2 hours | Accessibility polish |
| Analytics | LOW | 1 hour | Monitoring |
| Error boundaries | LOW | 1 hour | Error handling |
| Image optimization | LOW | 30 min | If adding images |
| Custom hooks | LOW | 2 hours | Code organization |

**Total Effort:** ~20 hours
**Total Impact:** Polish and long-term maintainability

---

## Testing Checklist

After implementing fixes, test the following:

### Functionality Tests
- [ ] User can create account and login
- [ ] User can create a bet
- [ ] User can join a bet
- [ ] User can create a group
- [ ] User can join a group
- [ ] Countdown timers update correctly
- [ ] Judging bets works properly
- [ ] Leaderboard displays correctly
- [ ] All modals open and close properly

### Performance Tests
- [ ] Run `npm run build` successfully
- [ ] Check bundle size (should be ~150-200KB smaller)
- [ ] Use React DevTools Profiler to verify reduced re-renders
- [ ] Check Firebase console for read count (should be 80-90% lower)
- [ ] Lighthouse score on mobile (target: 85+)
- [ ] Lighthouse score on desktop (target: 95+)

### Mobile Tests
- [ ] Test on actual iPhone (not just simulator)
- [ ] Test on actual Android device
- [ ] Verify viewport renders at proper width
- [ ] Tap all buttons easily (44x44px minimum)
- [ ] Scroll performance is smooth
- [ ] Input keyboards show correct type
- [ ] No iOS auto-zoom on input focus
- [ ] Safe area insets work correctly
- [ ] PWA install prompt appears

### Accessibility Tests
- [ ] Navigate entire app with keyboard only
- [ ] Test with VoiceOver (iOS) or TalkBack (Android)
- [ ] All inputs have labels
- [ ] All buttons have accessible names
- [ ] Modals can be closed with Escape key
- [ ] Color contrast meets WCAG AA standards
- [ ] Run axe DevTools extension (0 violations target)

### Browser Tests
- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] Chrome (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)

---

## Success Metrics

Track these metrics before and after implementation:

### Performance Metrics
| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Firebase reads/session | 500-1000+ | 75-110 | ___ |
| Re-renders/minute | 60+ | 1-5 | ___ |
| Initial bundle size | ~300KB | ~230KB | ___ |
| Time to interactive | ~3s | <2s | ___ |
| Lighthouse mobile | ~40 | >85 | ___ |

### User Experience Metrics
| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Mobile usability | 40/100 | >85/100 | ___ |
| Accessibility score | 60/100 | >95/100 | ___ |
| Core Web Vitals | Failing | Passing | ___ |
| User complaints | High | Low | ___ |

### Business Metrics (at 10K users)
| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Firebase cost/month | $50-200 | $5-20 | ___ |
| Bounce rate | High | <40% | ___ |
| Session duration | Low | >5min | ___ |
| Return users | Low | >60% | ___ |

---

## Estimated Timeline

- **Week 1:** Complete all P1 tasks (4 hours)
- **Week 2:** Complete all P2 tasks (10 hours)
- **Week 3-4:** Complete P3 tasks as needed (20 hours)
- **Total:** 34 hours over 2-4 weeks

---

## Resources & References

- [Firebase Query Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web.dev Performance](https://web.dev/performance/)
- [Next.js Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)

---

**End of Fix Plan**
