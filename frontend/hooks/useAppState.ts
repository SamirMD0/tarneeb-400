// Frontend/hooks/useAppState.ts
// Global application context. Single source of all state for UI components.
//
// Architecture decisions:
//
// WHY NO TOP-LEVEL REDUCER:
//   The domain hooks useRoom and useGameState already own reducers with the
//   correct granular action shapes and snapshot-replacement logic. Adding a
//   third reducer above them would require mirroring their action unions, creating
//   two places to update whenever a server event shape changes. The Context layer
//   here is a composition layer — it aggregates the three hook returns and exposes
//   them as a single context value. Reducers live where the state is owned.
//
// SNAPSHOT REPLACEMENT TIMING:
//   - Room snapshots: replaced inside roomReducer on room_created, room_joined,
//     player_joined, player_left, player_disconnected, player_reconnected.
//     Triggered by useRoomEvents listening to server events.
//   - Game snapshots: replaced inside gameStateReducer on GAME_STARTED and
//     STATE_UPDATED. Triggered by useGameEvents on game_started and game_state_updated.
//   - Connection state: replaced field-by-field inside connectionReducer on
//     socket lifecycle events. No server snapshot involved.
//   AppProvider does not intercept or transform any snapshot — it lets the
//   domain hooks handle their own replacement and reads the resulting state.
//
// STATE RESET ON DISCONNECT:
//   - Connection slice: useConnectionState dispatches DISCONNECTED on socket 'disconnect'.
//   - Room slice: useRoomEvents dispatches ROOM_LEFT on server 'room_left'. If the
//     disconnect is abnormal (no room_left from server), the room remains in state
//     until the socket reconnects and the server re-broadcasts or the player leaves.
//     We do NOT force-clear room state on disconnect because the player may reconnect
//     to the same room — useRoomEvents handles the rejoin re-sync automatically.
//   - Game slice: same principle. gameState persists through a disconnect so that
//     on reconnect, the rejoin event triggers game_state_updated and overwrites it.
//     A forced clear would cause a flash of null state before the server snapshot arrives.
//
// COMPONENT CONTRACT:
//   - Components call useAppState() to read state and access dispatchers.
//   - Components never import getSocket, useRoom, useGameState, or useGameEvents directly.
//   - Components never call socket.emit directly.
//   - All socket emission is done through the dispatcher functions provided here.

'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import { useRoom, type UseRoomReturn } from '@/hooks/useRoom';
import { useGameState, type UseGameStateReturn } from '@/hooks/useGameState';
import { useRoomEvents } from '@/hooks/useRoomEvents';
import { useGameEvents } from '@/hooks/useGameEvents';
import { useGameActions, type UseGameActionsReturn } from '@/hooks/useGameActions';
import { useConnectionState, type UseConnectionStateReturn } from '@/hooks/useConnectionState';
import { useDerivedGameView, type FullDerivedGameView } from '@/hooks/useDerivedGameView';

import type { AppDispatchers, RoomDispatchers, GameDispatchers, ConnectionDispatchers } from '@/lib/state';
import type { RoomState, SerializedRoom } from '@/types/room.types';
import type { GameState } from '@/types/game.types';

// ─── Context value shape ───────────────────────────────────────────────────────
// All fields are read-only at the type level. Mutations go through dispatchers only.

export interface AppContextValue {
  // ── State slices ─────────────────────────────────────────────────────────────
  connection: UseConnectionStateReturn;

  room: {
    roomId: string | null;
    room: SerializedRoom | null;
    myPlayerId: string | null;
    isLoading: boolean;
    availableRooms: SerializedRoom[];
    error: RoomState['error'];
  };

  game: {
    gameState: GameState | null;
    gameOver: UseGameStateReturn['gameOver'];
    lastError: UseGameStateReturn['lastError'];
    derived: FullDerivedGameView;   // extended view — components read this, never raw gameState
  };

  // ── Controlled dispatchers ────────────────────────────────────────────────────
  // Grouped by domain so components import only the slice they need.
  // Never expose socket or internal dispatch to consumers.
  dispatchers: AppDispatchers;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);
AppContext.displayName = 'AppContext';

// ─── AppProvider ───────────────────────────────────────────────────────────────

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps): React.ReactNode {
  // ── Domain hooks ──────────────────────────────────────────────────────────────
  // Each hook owns its own state slice and reducer.
  // Order matters: useGameState needs myPlayerId from useRoom.

  const roomHook = useRoom();
  const connectionHook = useConnectionState();
  const gameHook = useGameState(roomHook.myPlayerId);

  // ── Event wiring ──────────────────────────────────────────────────────────────
  // Side-effect hooks register all Server → Client listeners.
  // They must be called here — at the top of the tree — not inside individual page components,
  // to ensure listeners are active regardless of which page is currently rendered.

  useRoomEvents({
    dispatch: roomHook.dispatch,
    roomId: roomHook.roomId,
    myPlayerId: roomHook.myPlayerId,
  });

  useGameEvents({
    dispatch: gameHook.dispatch,
    roomId: roomHook.roomId,
  });

  // ── Derived game view ─────────────────────────────────────────────────────────
  // Extracted from useGameState so it can be independently tested and reused.
  // useDerivedGameView is memoized internally — no extra memo needed here.

  const derived = useDerivedGameView({
    gameState: gameHook.gameState,
    gameOver: gameHook.gameOver,
    myPlayerId: roomHook.myPlayerId,
  });

  // ── Game action emitters ───────────────────────────────────────────────────────
  // useGameActions requires derived to apply turn/phase guards.
  // Guards are safety nets — UI disabled-state must be driven by derived.isMyTurn etc.

  const gameActions: UseGameActionsReturn = useGameActions({
    derived,
    dispatch: gameHook.dispatch,
  });

  // ── Dispatchers ────────────────────────────────────────────────────────────────
  // Assembled here as the stable public API. Components call dispatchers[domain].action().
  // These references are stable across renders because the underlying hooks use useCallback.

  const roomDispatchers: RoomDispatchers = useMemo(
    () => ({
      createRoom: roomHook.createRoom,
      joinRoom: roomHook.joinRoom,
      leaveRoom: roomHook.leaveRoom,
      startGame: roomHook.startGame,
      refreshRoomList: roomHook.refreshRoomList,
    }),
    [roomHook.createRoom, roomHook.joinRoom, roomHook.leaveRoom, roomHook.startGame, roomHook.refreshRoomList]
  );

  const gameDispatchers: GameDispatchers = useMemo(
    () => ({
      placeBid: gameActions.placeBid,
      passBid: gameActions.passBid,
      selectTrump: gameActions.selectTrump,
      playCard: gameActions.playCard,
    }),
    [gameActions.placeBid, gameActions.passBid, gameActions.selectTrump, gameActions.playCard]
  );

  const connectionDispatchers: ConnectionDispatchers = useMemo(
    () => ({
      connect: connectionHook.connect,
      disconnect: connectionHook.disconnect,
    }),
    [connectionHook.connect, connectionHook.disconnect]
  );

  const dispatchers: AppDispatchers = useMemo(
    () => ({
      room: roomDispatchers,
      game: gameDispatchers,
      connection: connectionDispatchers,
    }),
    [roomDispatchers, gameDispatchers, connectionDispatchers]
  );

  // ── Context value ─────────────────────────────────────────────────────────────
  // Memoized so context consumers re-render only when their subscribed slice changes.
  // Note: all consumers of useAppState() re-render on ANY context value change.
  // For components that only need one slice, they should destructure at the call site
  // and use React.memo to prevent unnecessary re-renders from sibling slice updates.

  const contextValue = useMemo<AppContextValue>(
    () => ({
      connection: connectionHook,

      room: {
        roomId: roomHook.roomId,
        room: roomHook.room,
        myPlayerId: roomHook.myPlayerId,
        isLoading: roomHook.isLoading,
        availableRooms: roomHook.availableRooms,
        error: roomHook.error,
      },

      game: {
        gameState: gameHook.gameState,
        gameOver: gameHook.gameOver,
        lastError: gameHook.lastError,
        derived,
      },

      dispatchers,
    }),
    // Each field is stable-by-reference when its domain hook hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      connectionHook,
      roomHook.roomId,
      roomHook.room,
      roomHook.myPlayerId,
      roomHook.isLoading,
      roomHook.availableRooms,
      roomHook.error,
      gameHook.gameState,
      gameHook.gameOver,
      gameHook.lastError,
      derived,
      dispatchers,
    ]
  );

  return React.createElement(
    AppContext.Provider,
    { value: contextValue },
    children
  );
}

// ─── useAppState ───────────────────────────────────────────────────────────────
// The only hook components should import. Throws if called outside AppProvider,
// which surfaces the misconfiguration immediately rather than failing silently
// with null state.

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (ctx === null) {
    throw new Error(
      'useAppState must be called inside <AppProvider>. ' +
      'Ensure AppProvider wraps your layout or page tree.'
    );
  }
  return ctx;
}