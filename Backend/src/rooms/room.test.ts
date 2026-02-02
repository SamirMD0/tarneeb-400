// Backend/src/rooms/room.test.ts - PHASE 14 COMPREHENSIVE TESTS

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from './room.js';
import type { RoomConfig } from '../types/room.types.js';

describe('Room - Phase 14', () => {
  const defaultConfig: RoomConfig = {
    maxPlayers: 4,
    targetScore: 41,
  };

  function createRoom(id = 'test-room'): Room {
    return new Room(id, defaultConfig);
  }

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      const room = createRoom('room-123');

      assert.equal(room.id, 'room-123');
      assert.deepEqual(room.config, defaultConfig);
      assert.equal(room.players.size, 0);
      assert.equal(room.gameEngine, undefined);
    });

    it('should accept custom config', () => {
      const customConfig: RoomConfig = {
        maxPlayers: 4,
        targetScore: 51,
        allowBots: true,
      };

      const room = new Room('custom-room', customConfig);

      assert.deepEqual(room.config, customConfig);
    });
  });

  describe('addPlayer', () => {
    it('should add player successfully', () => {
      const room = createRoom();

      const result = room.addPlayer('p1', 'Alice');

      assert.equal(result, true);
      assert.equal(room.players.size, 1);
      
      const player = room.players.get('p1');
      assert.equal(player?.id, 'p1');
      assert.equal(player?.name, 'Alice');
      assert.equal(player?.isConnected, true);
    });

    it('should add multiple players up to 4', () => {
      const room = createRoom();

      assert.equal(room.addPlayer('p1', 'Alice'), true);
      assert.equal(room.addPlayer('p2', 'Bob'), true);
      assert.equal(room.addPlayer('p3', 'Charlie'), true);
      assert.equal(room.addPlayer('p4', 'Diana'), true);

      assert.equal(room.players.size, 4);
    });

    it('should reject 5th player when room is full', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');

      const result = room.addPlayer('p5', 'Eve');

      assert.equal(result, false);
      assert.equal(room.players.size, 4);
    });

    it('should reject duplicate player ID', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      const result = room.addPlayer('p1', 'Alice Clone');

      assert.equal(result, false);
      assert.equal(room.players.size, 1);
      assert.equal(room.players.get('p1')?.name, 'Alice'); // Original name
    });

    it('should reject adding players after game started', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');
      room.startGame();

      const result = room.addPlayer('p5', 'Eve');

      assert.equal(result, false);
    });
  });

  describe('removePlayer', () => {
    it('should remove player successfully', () => {
      const room = createRoom();
      room.addPlayer('p1', 'Alice');

      const result = room.removePlayer('p1');

      assert.equal(result, true);
      assert.equal(room.players.size, 0);
    });

    it('should return false for non-existent player', () => {
      const room = createRoom();

      const result = room.removePlayer('p999');

      assert.equal(result, false);
    });

    it('should invalidate game engine when player removed mid-game', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');
      room.startGame();

      assert.notEqual(room.gameEngine, undefined);

      room.removePlayer('p1');

      assert.equal(room.gameEngine, undefined);
    });

    it('should allow removing multiple players', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');

      room.removePlayer('p1');
      room.removePlayer('p3');

      assert.equal(room.players.size, 1);
      assert.equal(room.players.has('p2'), true);
    });
  });

  describe('isFull', () => {
    it('should return false when empty', () => {
      const room = createRoom();

      assert.equal(room.isFull(), false);
    });

    it('should return false with 3 players', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');

      assert.equal(room.isFull(), false);
    });

    it('should return true with 4 players', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');

      assert.equal(room.isFull(), true);
    });
  });

  describe('isReady', () => {
    it('should return false when not full', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');

      assert.equal(room.isReady(), false);
    });

    it('should return true when full and no game started', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');

      assert.equal(room.isReady(), true);
    });

    it('should return false after game started', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');
      room.startGame();

      assert.equal(room.isReady(), false);
    });
  });

  describe('startGame', () => {
    it('should start game successfully with 4 players', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');

      const result = room.startGame();

      assert.equal(result, true);
      assert.notEqual(room.gameEngine, undefined);
    });

    it('should fail to start with less than 4 players', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');

      const result = room.startGame();

      assert.equal(result, false);
      assert.equal(room.gameEngine, undefined);
    });

    it('should fail to start if game already started', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');
      room.startGame();

      const result = room.startGame();

      assert.equal(result, false);
    });

    it('should create GameEngine with correct player IDs', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');
      room.startGame();

      const state = room.gameEngine!.getState();
      const playerIds = state.players.map(p => p.id);

      assert.deepEqual(playerIds.sort(), ['p1', 'p2', 'p3', 'p4'].sort());
    });
  });

  describe('isEmpty', () => {
    it('should return true when no players', () => {
      const room = createRoom();

      assert.equal(room.isEmpty(), true);
    });

    it('should return false with players', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');

      assert.equal(room.isEmpty(), false);
    });

    it('should return true after all players removed', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.removePlayer('p1');
      room.removePlayer('p2');

      assert.equal(room.isEmpty(), true);
    });
  });

  describe('Connection Management', () => {
    it('should mark player as disconnected', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      const result = room.markPlayerDisconnected('p1');

      assert.equal(result, true);
      assert.equal(room.players.get('p1')?.isConnected, false);
    });

    it('should mark player as reconnected', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.markPlayerDisconnected('p1');
      const result = room.markPlayerReconnected('p1');

      assert.equal(result, true);
      assert.equal(room.players.get('p1')?.isConnected, true);
    });

    it('should return false for non-existent player on disconnect', () => {
      const room = createRoom();

      const result = room.markPlayerDisconnected('p999');

      assert.equal(result, false);
    });

    it('should check if all players connected', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');

      assert.equal(room.allPlayersConnected(), true);

      room.markPlayerDisconnected('p1');

      assert.equal(room.allPlayersConnected(), false);
    });
  });

  describe('Helper Methods', () => {
    it('should get player names', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');

      const names = room.getPlayerNames();

      assert.equal(names.length, 3);
      assert.ok(names.includes('Alice'));
      assert.ok(names.includes('Bob'));
      assert.ok(names.includes('Charlie'));
    });

    it('should return empty array for no players', () => {
      const room = createRoom();

      const names = room.getPlayerNames();

      assert.deepEqual(names, []);
    });
  });

  describe('Edge Cases - Phase 14 Hardening', () => {
    it('should handle adding player with empty name', () => {
      const room = createRoom();

      const result = room.addPlayer('p1', '');

      assert.equal(result, true);
      assert.equal(room.players.get('p1')?.name, '');
    });

    it('should handle removing player twice', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.removePlayer('p1');
      const result = room.removePlayer('p1');

      assert.equal(result, false);
    });

    it('should maintain player order (insertion order)', () => {
      const room = createRoom();

      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p1', 'Alice');
      room.addPlayer('p4', 'Diana');
      room.addPlayer('p2', 'Bob');

      const ids = [...room.players.keys()];

      assert.deepEqual(ids, ['p3', 'p1', 'p4', 'p2']);
    });

    it('should handle special characters in player names', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice™');
      room.addPlayer('p2', '李明');
      room.addPlayer('p3', 'Müller');

      assert.equal(room.players.get('p1')?.name, 'Alice™');
      assert.equal(room.players.get('p2')?.name, '李明');
      assert.equal(room.players.get('p3')?.name, 'Müller');
    });

    it('should handle very long player IDs', () => {
      const room = createRoom();

      const longId = 'p' + '1'.repeat(1000);
      const result = room.addPlayer(longId, 'Alice');

      assert.equal(result, true);
      assert.equal(room.players.has(longId), true);
    });
  });

  describe('Integration with GameEngine', () => {
    it('should initialize game with correct state', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');
      room.startGame();

      const state = room.gameEngine!.getState();

      assert.equal(state.players.length, 4);
      assert.equal(state.phase, 'DEALING');
      assert.equal(state.teams[1].score, 0);
      assert.equal(state.teams[2].score, 0);
    });

    it('should maintain separate player data in Room and GameEngine', () => {
      const room = createRoom();

      room.addPlayer('p1', 'Alice');
      room.addPlayer('p2', 'Bob');
      room.addPlayer('p3', 'Charlie');
      room.addPlayer('p4', 'Diana');
      room.startGame();

      // Room player has name
      assert.equal(room.players.get('p1')?.name, 'Alice');

      // GameEngine player does not have name (different type)
      const gamePlayer = room.gameEngine!.getState().players[0];
      assert.equal(gamePlayer?.id, 'p1');
      // Note: GameState PlayerState doesn't have 'name' property
    });
  });
});