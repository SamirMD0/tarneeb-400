# Phase 10–12 Integration & State Flow Validation

## Preamble

This section is the result of a line-by-line audit of every hook, lib module, type file,
page, and component in the frontend codebase. It documents what is correctly implemented,
what is dangling (written but not wired), what is missing from the app tree, and the
precise integration steps required to make Phases 10–12 operational end-to-end.

All findings are grounded in the actual source. Nothing is assumed.

---

## 1. Current State vs. Required State

### 1.1 What is correctly implemented

The hook layer (Phases 10–12) is architecturally sound and complete in isolation:

| Module | Status | Notes |
|---|---|---|
| `lib/socketSingleton.ts` | ✓ Correct | Single module-level instance, `autoConnect: false`, reconnect config present |
| `hooks/useRoom.ts` | ✓ Correct | `useReducer` over `roomReducer`, exposes emitter callbacks, internal `dispatch` |
| `hooks/useRoomEvents.ts` | ✓ Correct | Named handlers, `socket.off` cleanup, `stableDispatch` via `useCallback(dispatch, [])` |
| `hooks/useGameState.ts` | ✓ Correct | Full-snapshot replacement in reducer, `derived` via `useMemo` |
| `hooks/useGameEvents.ts` | ✓ Correct | Named handlers, cleanup, reconnect re-join |
| `hooks/useGameActions.ts` | ✓ Correct | Guards on `isMyTurn`/`phase`, clears error before emit |
| `hooks/useConnectionState.ts` | ✓ Correct | `useReducer`, latency via ping/pong, stable return via `useMemo` |
| `hooks/useDerivedGameView.ts` | ✓ Correct | Pure derivation, all output memoized, null-safe fallback |
| `hooks/useAppState.ts` | ✓ Correct | Composes all hooks, assembles dispatchers, `AppProvider`+`useAppState` pattern |
| `lib/state.ts` | ⚠ Partial | Defines `replaceGameSnapshot`/`replaceRoomSnapshot` but reducers don't call them |
| `types/game.types.ts` | ✓ Correct | Mirrors backend; `DerivedGameView` clearly separated from `GameState` |
| `types/room.types.ts` | ✓ Correct | `roomReducer` inline with types; initial state exported |
| `types/socket.types.ts` | ✓ Correct | Exact mirror of backend socket contract |

### 1.2 Critical gaps — wiring not yet performed

| Location | Gap | Consequence |
|---|---|---|
| `app/layout.tsx` | `AppProvider` is not mounted anywhere in the component tree | Every call to `useAppState()` throws at runtime |
| `app/layout.tsx` | `connection.connect()` is never called on app boot | Socket never connects; `autoConnect: false` means it stays idle indefinitely |
| `app/lobby/page.tsx` | Server component — cannot call hooks; lobby forms do `console.log` only | `createRoom` / `joinRoom` are never emitted |
| `app/room/[id]/page.tsx` | Server component — all room components use mock data | `join_room` is never emitted on page load; state is never hydrated |
| `components/game/GameBoard.tsx` | Hard-coded `MOCK_PHASE`, `MOCK_PLAYERS`, `MOCK_HAND`, `MOCK_TRICK` | Game state is never rendered from live snapshots |
| `components/game/BiddingPanel.tsx` | `handleBid`/`handlePass` → `console.log` | `place_bid` / `pass_bid` are never emitted |
| `components/room/RoomActions.tsx` | `handleLeave` → `console.log` | `leave_room` is never emitted |
| `lib/socket.ts` | Exports both `createSocket()` and re-exports `getSocket` | `createSocket()` produces a second, disconnected instance if called accidentally |

---

## 2. Architecture Overview

### 2.1 Intended data flow (as designed in Phases 10–12)

```
┌─────────────────────────────────────────────────────────────────┐
│  app/layout.tsx  (Next.js Root Layout — Server Component shell) │
│  └── <ClientRoot>  ('use client' wrapper, required boundary)    │
│       └── <AppProvider>  (mounts ALL hooks once at tree root)   │
│            ├── useConnectionState()  → connection slice         │
│            ├── useRoom()             → room slice               │
│            ├── useGameState()        → game slice               │
│            ├── useRoomEvents()       → wires S→C room events    │
│            ├── useGameEvents()       → wires S→C game events    │
│            ├── useDerivedGameView()  → computed game view       │
│            └── useGameActions()      → C→S game emitters        │
│                                                                  │
│       └── AppContext.Provider value = { connection, room,       │
│                                          game, dispatchers }     │
│                                                                  │
│            ├── <AppShell>  (Navbar + Footer, reads connection)  │
│            ├── /           (HomePage, no state needed)          │
│            ├── /lobby      (LobbyPage client component)         │
│            │    ├── CreateRoomForm → dispatchers.room.createRoom │
│            │    ├── JoinRoomForm   → dispatchers.room.joinRoom  │
│            │    └── RoomList       → dispatchers.room.joinRoom  │
│            └── /room/[id]  (RoomPage client component)          │
│                 ├── RoomHeader     → room.room                  │
│                 ├── PlayerRoster   → room.room.players          │
│                 ├── RoomStatus     → room.room, game.derived    │
│                 ├── RoomActions    → dispatchers.room.*         │
│                 └── GameBoard      → game.derived, dispatchers  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Socket instance ownership

```
lib/socketSingleton.ts
  └── getSocket()  ← single authoritative access point
       Called by:
         useRoom.ts           (emit only)
         useRoomEvents.ts     (listen only)
         useGameState.ts      (none — state only)
         useGameEvents.ts     (listen only)
         useGameActions.ts    (emit only)
         useConnectionState.ts (listen + connect/disconnect)
         useSocket.ts         (connect/disconnect — legacy; superseded by useConnectionState)

lib/socket.ts
  └── createSocket()  ← DEAD CODE. Must be deleted or unexported.
                         If called, produces a second disconnected instance.
  └── re-exports getSocket from socketSingleton  ← redundant
```

**Rule:** `getSocket()` from `lib/socketSingleton.ts` is the only legal socket access point.
`lib/socket.ts` should be deprecated. No component or hook may call `createSocket()`.

---

## 3. Integration Steps Required

### 3.1 Step 1 — `ClientRoot` wrapper (required for Next.js App Router)

`app/layout.tsx` is a Server Component. `AppProvider` uses hooks and must be a Client
Component. A thin wrapper is required:

```tsx
// app/ClientRoot.tsx
'use client';
import { AppProvider } from '@/hooks/useAppState';
import { useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';

function SocketConnector() {
  const { dispatchers } = useAppState();
  useEffect(() => {
    dispatchers.connection.connect();
    return () => {
      // Do NOT disconnect on unmount — the root never unmounts during normal navigation.
      // Disconnect is triggered explicitly on intentional logout only.
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <SocketConnector />
      {children}
    </AppProvider>
  );
}
```

```tsx
// app/layout.tsx  (updated)
import ClientRoot from './ClientRoot';
import AppShell from '@/components/layout/AppShell';
import '@/app/globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClientRoot>
          <AppShell>{children}</AppShell>
        </ClientRoot>
      </body>
    </html>
  );
}
```

`SocketConnector` is the single, authoritative location where `socket.connect()` is called.
It is mounted exactly once. No page component, no route component, no feature component
calls `connect()`. This prevents duplicate connection attempts on route changes.

### 3.2 Step 2 — Convert lobby page forms to client components

`app/lobby/page.tsx` remains a Server Component (for metadata, layout). The interactive
forms must be converted to Client Components that consume `useAppState()`:

**Pattern for `CreateRoomForm.tsx` (representative of all lobby components):**

```tsx
'use client';
import { useAppState } from '@/hooks/useAppState';

export function CreateRoomForm() {
  const { dispatchers, room } = useAppState();

  function handleSubmit(e) {
    e.preventDefault();
    // validation ...
    dispatchers.room.createRoom(
      { maxPlayers, targetScore },
      username.trim()
    );
  }

  // Show loading state while room.isLoading
  // Show ErrorBanner if room.error is set
  // On successful create: room.roomId becomes non-null → navigate to /room/[roomId]
}
```

**Navigation after successful room create/join** requires `useEffect` watching `room.roomId`:

```tsx
const router = useRouter();
useEffect(() => {
  if (room.roomId) {
    router.push(`/room/${room.roomId}`);
  }
}, [room.roomId, router]);
```

This replaces the mock `console.log` in `CreateRoomForm`, `JoinRoomForm`, and `RoomList`.

### 3.3 Step 3 — Convert room page to client component with join_room emit

`app/room/[id]/page.tsx` must become a Client Component. The `id` from params triggers
a `join_room` emit on mount:

```tsx
'use client';
import { useEffect } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { useParams } from 'next/navigation';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const { dispatchers, room, game, connection } = useAppState();

  // Join room on mount — re-runs if roomId changes (handles direct URL navigation)
  useEffect(() => {
    if (connection.isConnected && !room.roomId) {
      dispatchers.room.joinRoom(id);
    }
  }, [connection.isConnected, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leave room on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (room.roomId) {
        dispatchers.room.leaveRoom();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (room.isLoading || !room.room) return <LoadingState variant="room-hydrating" />;

  return (
    // Pass live room.room and game.derived to child components
  );
}
```

**Critical:** the `useEffect` for leave-on-unmount uses an empty dependency array intentionally.
It captures `dispatchers.room.leaveRoom` at mount time. Because `leaveRoom` is stable
(wrapped in `useCallback([socket])` in `useRoom.ts`), this is safe. The socket emit fires
regardless of what `roomId` is at unmount time — the server ignores a leave_room from a
socket not in a room.

### 3.4 Step 4 — Wire GameBoard to live state

`GameBoard.tsx` must delete all `MOCK_*` constants and receive props from `useAppState()`:

```tsx
'use client';
import { useAppState } from '@/hooks/useAppState';

export function GameBoard() {
  const { game, dispatchers } = useAppState();
  const { derived } = game;

  if (!derived.phase) return <LoadingState variant="game-hydrating" />;

  // Use derived.myHand, derived.currentTrick, derived.phase, derived.isMyTurn
  // Pass dispatchers.game.placeBid, dispatchers.game.playCard, etc. as props
  // to BiddingPanel, HandCards, TrumpSelector
}
```

### 3.5 Step 5 — Wire interactive game action components

**BiddingPanel:**
```tsx
function handleBid() {
  if (!selectedBid) return;
  dispatchers.game.placeBid(selectedBid);  // replaces console.log
  setSelectedBid(null);
}
function handlePass() {
  dispatchers.game.passBid();  // replaces console.log
}
```

**RoomActions:**
```tsx
function handleLeave() {
  dispatchers.room.leaveRoom();   // replaces console.log
  router.push('/lobby');
}
// handleToggleReady maps to dispatchers.room.startGame() for the host
// or a future ready_up event (not yet in socket contract)
```

---

## 4. Event Flow Diagrams

### 4.1 Room creation flow

```
User fills CreateRoomForm → clicks Submit
  │
  ▼
dispatchers.room.createRoom(config, playerName)
  │
  ├── roomReducer: LOADING → { isLoading: true, error: null }
  │
  └── socket.emit('create_room', { config, playerName })
        │
        ▼ (server)
        room.handler.ts creates room, adds player, emits room_created to socket
        │
        ▼ (client)
  useRoomEvents.ts onRoomCreated(data)
  └── stableDispatch({ type: 'ROOM_JOINED', roomId, room, myPlayerId: socket.id })
        │
        ▼
  roomReducer: ROOM_JOINED → { roomId, room, myPlayerId, isLoading: false }
        │
        ▼
  AppContext updates → useAppState() consumers re-render
        │
        ▼
  room.roomId is now non-null → useEffect in CreateRoomForm fires
        │
        ▼
  router.push('/room/[roomId]')
```

### 4.2 Game action flow (bid)

```
BiddingPanel: user clicks "Bid 9"
  │
  ▼
dispatchers.game.placeBid(9)
  │
  ├── useGameActions: guard check — derived.isMyTurn && derived.phase === 'BIDDING'
  ├── dispatch({ type: 'CLEAR_ERROR' })
  └── socket.emit('place_bid', { value: 9 })
        │
        ▼ (server)
        bidding.handler.ts validates bid, updates game state, emits game_state_updated
        │
        ▼ (client, two possible outcomes)

  [Success path]
  useGameEvents.ts onGameStateUpdated(data)
  └── stableDispatch({ type: 'STATE_UPDATED', gameState: data.gameState })
        │
        ▼
  gameStateReducer: STATE_UPDATED → full snapshot replacement, lastError: null
        │
        ▼
  useDerivedGameView recomputes: new activePlayerId, new isMyTurn, new highestBid
        │
        ▼
  BiddingPanel re-renders: updated currentBid, new isMyTurn (probably false now)

  [Error path]
  useGameEvents.ts onError(data) — code: 'INVALID_ACTION' or 'NOT_YOUR_TURN'
  └── stableDispatch({ type: 'SET_ERROR', error: data })
        │
        ▼
  gameStateReducer: SET_ERROR → { lastError: { code, message } }
        │
        ▼
  GameBoard reads game.lastError → renders ErrorBanner
```

### 4.3 Reconnect flow

```
Socket disconnects (network drop, server restart)
  │
  ▼
useConnectionState.ts onDisconnect()
└── dispatch({ type: 'DISCONNECTED' }) → isConnected: false, isConnecting: false
  │
  ▼
AppShell reads connection.isConnected → renders LoadingState variant="reconnecting"
All interactive controls read connection.isConnected → disabled=true
  │
  ▼ (Socket.IO internal — reconnection: true)
useConnectionState.ts onReconnectAttempt(attempt)
└── dispatch({ type: 'RECONNECT_ATTEMPT', attempt }) → isConnecting: true
  │
  ▼ (reconnect succeeds)
useConnectionState.ts onConnect()
└── dispatch({ type: 'CONNECTED' }) → isConnected: true, reconnectAttempt: 0
  │
  ▼ (same 'connect' event, two listeners fire)
useRoomEvents.ts onReconnect() — if roomId !== null:
└── socket.emit('join_room', { roomId })
useGameEvents.ts onReconnect() — if roomId !== null:
└── socket.emit('join_room', { roomId })   ← duplicate emit, see §5.3
  │
  ▼ (server handles join_room idempotently, re-adds socket to room, re-broadcasts)
useRoomEvents.ts onRoomJoined(data)
└── dispatch ROOM_JOINED → room slice replaced with fresh snapshot
useGameEvents.ts onGameStateUpdated(data)
└── dispatch STATE_UPDATED → game slice replaced with fresh snapshot
  │
  ▼
LoadingState unmounts. UI re-enables. State is server-authoritative again.
```

---

## 5. State Ownership Table

| State domain | Owner | Storage | Replaced by | Reset by |
|---|---|---|---|---|
| Socket transport | `lib/socketSingleton.ts` | Module singleton | Never replaced | `socket.disconnect()` |
| Connection flags | `useConnectionState` reducer | React `useReducer` | Socket lifecycle events | `RESET` action |
| Room snapshot | `useRoom` reducer (`roomReducer`) | React `useReducer` | `ROOM_JOINED`, `ROOM_UPDATED` | `ROOM_LEFT` |
| My player ID | `useRoom` reducer | React `useReducer` | `ROOM_JOINED` | `ROOM_LEFT` |
| Game snapshot | `useGameState` reducer | React `useReducer` | `GAME_STARTED`, `STATE_UPDATED` | `ROOM_LEFT` clears roomId; game slice persists until next GAME_STARTED |
| Game over result | `useGameState` reducer | React `useReducer` | `GAME_OVER` action | Next `GAME_STARTED` |
| Derived game view | `useDerivedGameView` | `useMemo` (no storage) | Any `gameState` or `myPlayerId` change | Recomputed automatically |
| Action error | `useGameState` reducer | React `useReducer` | `CLEAR_ERROR`, `STATE_UPDATED` | Phase change |
| Latency | `useConnectionState` reducer | React `useReducer` | `LATENCY_MEASURED` | `RESET` |
| Action pending (bid) | Local `useState` in BiddingPanel | Component state | `useEffect` on `gameState` change | Phase change |
| Action pending (play) | Local `useState` in HandCards | Component state | `useEffect` on `gameState` change | Phase change |

**Non-negotiable rules derived from this table:**

1. No component reads `GameState` directly. It reads `game.derived` from `useAppState()`.
2. No component reads `SerializedRoom` directly. It reads `room.room` from `useAppState()`.
3. No component calls `socket.emit()`. It calls `dispatchers.{domain}.{action}()`.
4. `gameState` is never patched or merged. Every update is a full snapshot replacement.
5. `room` is never patched or merged. Every update is a full snapshot replacement.

---

## 6. Safety Guarantees

### 6.1 Exactly one socket instance

`lib/socketSingleton.ts` creates the socket on first `getSocket()` call and returns it
on all subsequent calls. The module is a singleton because JavaScript module scope is
singleton per process. All hooks call `getSocket()` directly. `lib/socket.ts`'s
`createSocket()` factory must be deleted to eliminate the risk of accidental second instance.

### 6.2 No duplicate listeners

`useRoomEvents.ts` and `useGameEvents.ts` both register listeners inside a `useEffect`.
The `AppProvider` mounts once at the root layout. React Strict Mode (dev only) will mount
twice — the cleanup functions (`socket.off`) are correctly implemented with named handlers,
so double-mount produces one active registration, not two.

If `AppProvider` is accidentally mounted in two places, two sets of listeners would fire,
causing double-dispatch on every server event. Prevention: `AppProvider` must only appear
in `app/layout.tsx` (via `ClientRoot`). ESLint can enforce this with a no-restricted-imports
rule targeting `AppProvider` outside of `ClientRoot.tsx`.

### 6.3 No stale closures in event handlers

`useRoomEvents.ts` uses `stableDispatch = useCallback(dispatch, [])`. The `roomId` in
`deps` ensures the reconnect handler sees the current `roomId` without recreating all
other handlers. The pattern is correct because `roomId` changes infrequently
(only on join/leave).

`useGameEvents.ts` uses the same `stableDispatch` pattern with `[socket, stableDispatch, roomId]`
as deps. Correct.

`useConnectionState.ts` registers handlers inside `useEffect` with `[socket]` as dep.
Since `socket` is the singleton (stable reference), this effect runs exactly once.

### 6.4 Snapshot safety — no null dereference

`useDerivedGameView` returns the `makeNullDerivedView(gameOver)` fallback when
`gameState === null`. Every field in `FullDerivedGameView` is non-optional with a defined
null/empty value. Components reading `derived.myHand` always get `Card[]`, never
`undefined`. TypeScript strict mode enforces this at the type boundary.

`useAppState()` throws a descriptive error if called outside `AppProvider`. This surfaces
the missing-provider mistake immediately in development rather than silently returning null.

### 6.5 Illegal emit prevention

`useGameActions.ts` guards every emit:
- `placeBid` / `passBid`: `derived.isMyTurn && derived.phase === 'BIDDING'`
- `selectTrump`: `derived.mustSelectTrump`
- `playCard`: `derived.isMyTurn && derived.phase === 'PLAYING'`

UI must *also* set `disabled` on controls when `!derived.isMyTurn`. The action guard is
a safety net for race conditions (e.g. double-tap), not a substitute for disabled UI state.

### 6.6 Route change during game

On navigation away from `/room/[id]`:
1. `RoomPage` unmount cleanup fires: `dispatchers.room.leaveRoom()` → `socket.emit('leave_room')`.
2. Server removes player from room, broadcasts `player_left` to remaining players.
3. Server emits `room_left` back to the leaving socket.
4. `useRoomEvents.ts` `onRoomLeft` fires: `dispatch({ type: 'ROOM_LEFT' })`.
5. `roomReducer` resets to `initialRoomState` (all fields null/false).
6. `gameState` slice is NOT cleared by `ROOM_LEFT`. It persists until the next `GAME_STARTED`.
   This is intentional — if the player navigates back to lobby and re-joins a room with an
   active game, the stale `gameState` will be overwritten by the server's `game_state_updated`
   on rejoin. There is no false "game active" render because `room.roomId` is null, so
   `GameBoard` is never rendered.

### 6.7 Disconnect mid-game (bid in flight, no response)

1. Socket disconnects after `place_bid` emit but before `game_state_updated` arrives.
2. `useConnectionState` dispatches `DISCONNECTED`.
3. UI freezes: all controls read `connection.isConnected === false` and become disabled.
4. `action-pending` local state in BiddingPanel is still `true`. This is acceptable — the
   loading indicator remains visible during reconnect.
5. On reconnect: `join_room` re-emitted → server re-broadcasts `game_state_updated` with
   the current authoritative state (bid may or may not have been accepted).
6. `STATE_UPDATED` fires → `gameState` replaced → `useDerivedGameView` recomputes.
7. `useEffect` in BiddingPanel watching `gameState` clears `pending` state.
8. No action is replayed. No duplicate bid is emitted.

### 6.8 Snapshot arriving after component unmount

`useEffect` cleanup in `useRoomEvents` and `useGameEvents` calls `socket.off` for all
listeners. If the component tree unmounts (e.g. user navigates to `/`) while a snapshot
is in transit:
- If the snapshot arrives before cleanup runs: `dispatch` fires, state updates, but
  no subscriber renders (tree is gone). State update is a no-op in terms of rendering.
- If the snapshot arrives after cleanup: listener is unregistered, snapshot is ignored.
  This is safe because the user has left the room.

React 18 strict mode double-mount: cleanup runs, re-registers. Net result: single
registration. Snapshot delivery is not affected.

---

## 7. Known Issues and Required Fixes

### 7.1 `lib/socket.ts` — dead `createSocket()` export

**Risk:** Any import of `createSocket` from `lib/socket.ts` produces a second disconnected
socket instance with a different socket ID. Room join, game events, and reconnect all
break silently.

**Fix:** Delete `createSocket` from `lib/socket.ts`, or delete `lib/socket.ts` entirely and
update all imports to point directly at `lib/socketSingleton.ts`.

### 7.2 Double `join_room` emit on reconnect

Both `useRoomEvents.ts` and `useGameEvents.ts` register `onReconnect` on the `'connect'`
socket event. Both emit `join_room` if `roomId !== null`. This produces two `join_room`
emits on every reconnect.

**Acceptable if:** Backend `room.handler.ts` handles `join_room` idempotently (player
already in room → update socket reference, re-broadcast state, no error). BACKEND_SUMMARY
does not contradict this, but idempotency should be confirmed against `room.handler.ts`
before relying on it.

**Fix if not idempotent:** Remove `onReconnect` from `useGameEvents.ts`. Let `useRoomEvents.ts`
own the reconnect re-join exclusively. `useGameEvents.ts` receives the `game_state_updated`
that the server broadcasts on rejoin via its normal `onGameStateUpdated` listener.

### 7.3 `lib/state.ts` orphaned utilities

`replaceGameSnapshot` and `replaceRoomSnapshot` in `lib/state.ts` are defined but not used.
The reducers in `useGameState.ts` and `types/room.types.ts` inline their own replacement
logic — which is functionally correct but diverges from the intended centralization.

**Fix (optional but hygiene):** Replace the inline reducer cases with calls to the
`lib/state.ts` utilities. Example for `gameStateReducer`:
```ts
case 'GAME_STARTED':
  return replaceGameSnapshot(state, action.gameState);
case 'STATE_UPDATED':
  return replaceGameSnapshot(state, action.gameState);
```
This makes the "full snapshot replacement, never merge" rule visually explicit and enforced
in one place rather than by convention in each reducer.

### 7.4 `useSocket.ts` — superseded by `useConnectionState`

`hooks/useSocket.ts` tracks `isConnected` via local `useState` with the same socket events
as `useConnectionState.ts`. If both are active, two listeners compete on `connect` /
`disconnect`. `useSocket.ts` should not be mounted after `useConnectionState` is active.

**Fix:** Delete `useSocket.ts` or mark it `@deprecated`. `AppProvider` already mounts
`useConnectionState`. Nothing should call `useSocket` directly.

---

## 8. Performance Considerations

### 8.1 Context re-render scope

`useAppState()` returns the entire `AppContextValue`. Any change to any slice (connection,
room, game) triggers re-render in every consumer. For components that only read one slice:

- Use destructuring at the call site: `const { game } = useAppState()`.
- Wrap with `React.memo` to prevent re-renders when `game` reference is stable.
- `game.derived` is stable between snapshots because `useDerivedGameView` returns the
  module-level `makeNullDerivedView` when `gameState === null`, and `useMemo` returns the
  previous reference when inputs are referentially equal.

Components that subscribe to the full context on every render:
- `GameBoard` (reads `game.derived` + `dispatchers`) — should be `React.memo`
- `PlayerRoster` (reads `room.room.players`) — should be `React.memo`
- `BiddingPanel` (reads `derived.isMyTurn`, `derived.trickSummary.bidValue`) — fine, low-cost

### 8.2 Snapshot frequency

The backend emits `game_state_updated` after every accepted action (bid, play_card,
set_trump). In a 4-player game with rapid play, this could be 52 emissions per round.
Each emission:
1. Calls `onGameStateUpdated` (single function call, O(1))
2. Calls `stableDispatch` (single `useReducer` dispatch)
3. Triggers `gameStateReducer` (single switch case, O(1) object creation)
4. Triggers `useDerivedGameView` useMemo (O(n) over `players` array — max 4 elements)
5. Triggers context value `useMemo` (reference equality check over ~10 fields)
6. Triggers re-render of all `useAppState()` consumers

The player-count cap (4) and the pure derivation in `useDerivedGameView` make this
lightweight. No `useEffect` chains are triggered by snapshot arrival — only re-renders.

### 8.3 Listener registration cost

`useRoomEvents` and `useGameEvents` each register ~8 listeners once at mount (AppProvider
mount). They do not re-register on snapshot arrival. The `[socket, stableDispatch, roomId]`
dep array means re-registration only happens on reconnect (`socket` is stable, but
`roomId` changes on join/leave). This is the correct behavior and the cost is negligible.
