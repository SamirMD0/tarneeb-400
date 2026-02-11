# Tarneeb/400 Frontend - Development Phases

## Phase 0: Frontend Repository Initialization
**Goal:** Create an empty, frontend-dedicated workspace with project-level standards and no application logic.

**Create:**
- `Frontend/.gitignore` (node_modules, .next, out, coverage, .env files, editor artifacts)
- `Frontend/README.md` (frontend purpose, local run instructions, architecture rules)
- `Frontend/.editorconfig` (line endings, indentation, charset)
- `Frontend/.nvmrc` (Node 20+)
- `Frontend/.prettierrc` (format defaults)
- `Frontend/.eslintrc.json` (baseline linting rules)

**Implemented:**
- Frontend repo standards and ignore policy
- Baseline formatting and linting configuration
- Node runtime version lock
- Documentation for frontend-only scope

**Not Implemented:** Next.js app, components, routing, API wiring, WebSocket wiring

---

## Phase 1: Next.js Setup with TypeScript
**Goal:** Bootstrap a strict TypeScript Next.js App Router application that compiles and serves a placeholder page.

**Create:**
```text
Frontend/
├── package.json
├── tsconfig.json
├── next.config.ts
├── next-env.d.ts
├── app/
│   ├── layout.tsx
│   └── page.tsx
└── public/
```

**Implemented:**
- Next.js App Router initialized
- TypeScript strict mode enabled
- Root layout and landing page render successfully
- Scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`

**Not Implemented:** Feature pages, shared components, styling system, backend integration

---

## Phase 2: Tailwind Setup and Design System Foundation
**Goal:** Enable utility-first styling with a minimal design token foundation for consistent UI.

**Create:**
```text
Frontend/
├── tailwind.config.ts
├── postcss.config.js
├── app/globals.css
└── styles/
    └── tokens.css
```

**Implemented:**
```ts
// tailwind.config.ts
- content includes app/, components/, ui/, hooks/
- theme.extend colors for brand, success, warning, danger
- spacing and radius tokens aligned with design system
```

```css
/* tokens.css */
:root {
  --color-bg: 15 23 42;
  --color-card: 30 41 59;
  --color-text: 248 250 252;
  --radius-md: 0.5rem;
}
```

- Global typography, spacing reset, and dark-friendly defaults

**Not Implemented:** Feature-specific themes, animations, accessibility refinements

---

## Phase 3: Folder Architecture Enforcement
**Goal:** Enforce strict separation of concerns and prevent logic leakage into the routing layer.

**Create:**
```text
Frontend/
├── app/                 # Next.js App Router pages only
│   ├── layout.tsx
│   ├── page.tsx
│   ├── room/[id]/page.tsx
│   └── lobby/page.tsx
├── components/          # Feature-level components (GameBoard, Lobby, etc.)
├── ui/                  # Mini reusable UI components (Button, Input, Modal, Card)
├── hooks/               # Custom React hooks only (useSocket, useRoom, useGameState)
├── lib/                 # API and socket client setup
├── types/               # Shared frontend types
├── styles/
└── middleware.ts
```

**Implemented:**
- Architecture contract documented and enforced in README and lint rules
- `app/` restricted to routing and page composition only
- `ui/` restricted to small presentational primitives
- `hooks/` restricted to custom hooks only
- `lib/` hosts transport adapters (REST, socket client), not UI code

**Not Implemented:** Feature behavior, event handling, business workflows

---

## Phase 4: UI Primitives (Button, Input, Modal, Card, Badge)
**Goal:** Build reusable, style-consistent building blocks independent of game features.

**Create:**
```text
Frontend/ui/
├── Button.tsx
├── Input.tsx
├── Modal.tsx
├── Card.tsx
├── Badge.tsx
└── index.ts
```

**Implemented:**
```tsx
// ui/Button.tsx
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};
```

- Accessible base states (focus ring, disabled style, keyboard support)
- Variant + size patterns shared across primitives
- Minimal prop APIs to avoid premature complexity

**Not Implemented:** Domain-specific game rendering (cards, bids, seats)

---

## Phase 5: Layout System (App Layout, Navbar, Responsive Shell)
**Goal:** Establish universal page framing for consistent navigation and responsive structure.

**Create:**
```text
Frontend/components/layout/
├── AppShell.tsx
├── Navbar.tsx
├── Footer.tsx
└── Container.tsx

Frontend/app/
├── layout.tsx
└── page.tsx
```

**Implemented:**
- `app/layout.tsx` composes `AppShell` only
- Top navigation with links: Home, Lobby, Active Room
- Responsive container breakpoints (mobile-first)
- Shared metadata scaffold (title template, description)

**Not Implemented:** Auth menus, profile panels, dynamic notifications

---

## Phase 6: Lobby Pages UI (Create Room, Join Room)
**Goal:** Create lobby user interfaces with form UX only (no network mutation yet).

**Create:**
```text
Frontend/app/lobby/page.tsx
Frontend/components/lobby/
├── CreateRoomForm.tsx
├── JoinRoomForm.tsx
├── RoomList.tsx
└── LobbyHeader.tsx
```

**Implemented:**
- Inputs for username, room code, optional room settings
- Static room list card layout for upcoming backend data
- Validation UX for required fields (client form-level only)
- Empty-state and no-room placeholder views

**Not Implemented:** Actual REST calls, room creation, room join execution

---

## Phase 7: Room Page UI Skeleton
**Goal:** Render a complete room view scaffold before wiring live data.

**Create:**
```text
Frontend/app/room/[id]/page.tsx
Frontend/components/room/
├── RoomHeader.tsx
├── PlayerRoster.tsx
├── RoomStatus.tsx
└── RoomActions.tsx
```

**Implemented:**
- Dynamic route `/room/[id]` with placeholder room identifier
- Sections for roster, game status, table region, and action panel
- Waiting-room visual state for pre-game readiness

**Not Implemented:** Real player presence, game lifecycle transitions

---

## Phase 8: Game Board UI (Cards, Player Seats, Bidding Panel)
**Goal:** Build feature-level game visuals with static/mock data contracts.

**Create:**
```text
Frontend/components/game/
├── GameBoard.tsx
├── PlayerSeat.tsx
├── HandCards.tsx
├── TrickArea.tsx
├── BiddingPanel.tsx
└── TrumpSelector.tsx
```

**Implemented:**
- Seat map for 4-player table positions
- Hand card rendering component and selected state visuals
- Bidding panel shell with controls (Bid, Pass)
- Trump selector UI with suit icons

**Not Implemented:** Rule enforcement, bid validation logic, legal move logic (backend-owned)

---

## Phase 9: Socket.IO Client Setup
**Goal:** Add typed socket connectivity layer without embedding event logic in components.

**Create:**
```text
Frontend/lib/
├── socket.ts
├── api.ts
└── env.ts

Frontend/types/
└── socket.types.ts
```

**Implemented:**
```ts
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

export const createSocket = (url: string): Socket =>
  io(url, { transports: ['websocket'], autoConnect: false });
```

- Single socket factory with reconnect-safe defaults
- Environment-driven server URL resolution
- Shared event typing imported from frontend `types/`

**Not Implemented:** Room event handlers, game event handlers, state synchronization

---

## Phase 10: Wiring Room Events (join, leave, room_state)
**Goal:** Connect room lifecycle socket events to frontend state adapters.

**Create:**
```text
Frontend/hooks/
├── useSocket.ts
├── useRoom.ts
└── useRoomEvents.ts

Frontend/types/
└── room.types.ts
```

**Implemented:**
- `useSocket` for connection lifecycle (connect/disconnect)
- `useRoom` for join/leave actions routed through socket client
- `room_state` listener updates UI-facing room state model
- Cleanup of listeners on unmount to prevent duplicate handlers

**Not Implemented:** Game action events, optimistic state mutation, offline queueing

---

## Phase 11: Wiring Game Events (bid, play_card, set_trump)
**Goal:** Bind gameplay interactions to documented socket events with strict payload typing.

**Create:**
```text
Frontend/hooks/
├── useGameState.ts
└── useGameEvents.ts

Frontend/types/
└── game.types.ts
```

**Implemented:**
- Emitters for `bid`, `play_card`, `set_trump`
- Listeners for game snapshot / delta updates from backend
- UI actions disabled when backend state indicates non-turn player
- All payload contracts mapped from `SOCKET_EVENTS.md`

**Not Implemented:** Client-side rule engine or fallback adjudication

---

## Phase 12: Global State Management Strategy (without Redux unless justified)
**Goal:** Centralize frontend state flow with lightweight React-native patterns.

**Create:**
```text
Frontend/hooks/
├── useAppState.ts
├── useConnectionState.ts
└── useDerivedGameView.ts

Frontend/lib/
└── state.ts
```

**Implemented:**
- Strategy: React Context + hooks + localized `useReducer` where needed
- Server-authoritative state model: backend snapshots are source of truth
- Derived selectors for view state (active player, trick summary, room readiness)
- Clear split between transport state and render state

**Not Implemented:** Redux/Zustand adoption (deferred unless complexity justifies)

---

## Phase 13: Error Handling & Loading States
**Goal:** Make all async boundaries explicit and user-facing.

**Create:**
```text
Frontend/components/feedback/
├── LoadingState.tsx
├── ErrorBanner.tsx
├── RetryPanel.tsx
└── EmptyState.tsx
```

**Implemented:**
- Room loading/skeleton state
- Socket disconnected and reconnecting indicators
- Friendly recoverable error banners with retry action
- Route-level and component-level fallback states

**Not Implemented:** Crash reporting provider integration (Sentry/DataDog)

---

## Phase 14: Animations (Card Play, Trick Resolution)
**Goal:** Add motion for gameplay clarity without hurting responsiveness.

**Create:**
```text
Frontend/components/game/animations/
├── CardPlayMotion.tsx
├── TrickCollectMotion.tsx
└── BidPulse.tsx
```

**Implemented:**
- Card transition to trick area
- Trick winner highlight + collect animation
- Subtle bid confirmation pulse
- Reduced-motion support fallback

**Not Implemented:** Heavy 3D transitions, GPU-expensive effects

---

## Phase 15: Responsive/Mobile Optimization
**Goal:** Ensure full game flow is usable on phones, tablets, and desktops.

**Create:**
- Tailwind breakpoint utilities integrated in game and lobby components
- Mobile-specific layout helpers in `components/layout/`

**Implemented:**
- Compact card sizing and horizontal scroll hand area on small screens
- Touch-friendly controls and spacing for bidding/play actions
- Rotational resilience (portrait primary, landscape supported)

**Not Implemented:** Native app wrappers (React Native/Capacitor)

---

## Phase 16: Accessibility Pass
**Goal:** Meet production accessibility baseline across interaction-heavy screens.

**Create:**
- Accessibility checklist in `Frontend/README.md`
- Optional helper utilities in `ui/a11y.ts`

**Implemented:**
- Semantic headings and landmark regions
- Keyboard navigation for modals/forms/actions
- ARIA labels for icon-only controls and game actions
- Contrast verification and visible focus indicators

**Not Implemented:** Full WCAG AAA optimization

---

## Phase 17: Performance Optimization (Memoization, Avoiding Re-renders)
**Goal:** Prevent avoidable rerenders during high-frequency socket updates.

**Create:**
```text
Frontend/lib/perf.ts
Frontend/hooks/useStableHandlers.ts
```

**Implemented:**
- `React.memo` for heavy feature components (`GameBoard`, `PlayerSeat`)
- `useMemo`/`useCallback` for derived props and handlers
- Event listener deduplication and batched state updates
- Profiling in dev to detect render hotspots

**Not Implemented:** Premature micro-optimizations not backed by profiling

---

## Phase 18: Environment Configuration (.env.local)
**Goal:** Standardize local/runtime configuration without hardcoding infrastructure values.

**Create:**
```text
Frontend/.env.example
Frontend/.env.local
Frontend/lib/env.ts
```

**Implemented:**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_ENV=development
```

- Runtime validation of required public env variables
- Clear separation of local vs production variables

**Not Implemented:** Secret backend credentials in frontend env (prohibited)

---

## Phase 19: Production Build Validation
**Goal:** Verify release artifacts are stable, typed, and lint-clean before deployment.

**Create:**
- CI-compatible validation checklist in `Frontend/README.md`

**Implemented:**
```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

- Validate hydration-safe rendering
- Validate no Node-only modules in client bundles
- Smoke-test core routes: `/`, `/lobby`, `/room/[id]`

**Not Implemented:** End-to-end browser matrix automation (deferred)

---

## Phase 20: Vercel Deployment
**Goal:** Deploy frontend to Vercel with environment-aware configuration and reliable rollouts.

**Create:**
- `vercel.json` (if custom headers/rewrites needed)
- Vercel project settings and environment variables

**Implemented:**
- Connect Git repository to Vercel
- Configure production and preview env vars
- Confirm Next.js build target compatibility with App Router
- Verify backend URL points to production API/WebSocket endpoint

**Not Implemented:** Multi-region traffic steering customizations

---

## Phase 21: Post-Deploy Verification Checklist
**Goal:** Confirm production behavior, observability, and operational readiness.

**Create:**
- Deployment checklist section in `Frontend/README.md`

**Implemented:**
```text
- Open landing page and lobby in production
- Create room and join from second browser session
- Validate room_state synchronization
- Execute bid, set_trump, play_card flow
- Verify reconnect behavior after temporary disconnect
- Confirm mobile viewport usability
- Confirm console is free of uncaught runtime errors
```

- Verify all state remains backend-authoritative
- Verify no frontend duplication of backend game rules
- Capture release notes and known limitations

**Not Implemented:** Automated canary rollback orchestration
