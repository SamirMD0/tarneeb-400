import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as Client } from 'socket.io-client';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { AddressInfo } from 'net';
import express from 'express';
import { registerHandlers } from '../../sockets/socketHandlers.js';

describe('Socket Integration Failure Modes', () => {
    let io: Server;
    let server: any;
    let port: number;

    before(async () => {
        const app = express();
        server = createServer(app);
        io = new Server(server);

        // Register handlers (no auth middleware — testing error paths only)
        registerHandlers(io);

        await new Promise<void>((resolve) => {
            server.listen(() => {
                port = (server.address() as AddressInfo).port;
                resolve();
            });
        });
    });

    after(() => {
        io.close();
        server.close();
    });

    it('should reject malformed game actions with VALIDATION_ERROR', async () => {
        const clientSocket = Client(`http://localhost:${port}`);

        try {
            await new Promise<void>((resolve) => clientSocket.on('connect', resolve));

            // Manually set socket.data.roomId on the server side to bypass room check
            // We want to test that the VALIDATION path triggers for bad payloads
            const serverSockets = await io.fetchSockets();
            const matched = serverSockets.find(s => s.id === clientSocket.id);
            if (matched) {
                matched.data.roomId = 'fake-room-id';
            }

            // Send malformed action (missing the `action` wrapper or missing `type`)
            const result = await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timed out waiting for error event')), 4000);

                clientSocket.on('error', (err: any) => {
                    clearTimeout(timeout);
                    try {
                        assert.equal(err.code, 'VALIDATION_ERROR');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                // Invalid payload — no `action` key, no `type` field
                clientSocket.emit('game_action', { invalid: 'payload' });
            });
        } finally {
            clientSocket.close();
        }
    });

    it('should reject actions when not in a room', async () => {
        // New client, not in any room — socket.data.roomId is undefined
        const socket2 = Client(`http://localhost:${port}`);

        try {
            await new Promise<void>((resolve) => socket2.on('connect', resolve));

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timed out waiting for error event')), 4000);

                socket2.on('error', (err: any) => {
                    clearTimeout(timeout);
                    try {
                        assert.equal(err.code, 'NOT_IN_ROOM');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });

                // Valid action structure, but socket has no room
                socket2.emit('game_action', { action: { type: 'BID', playerId: 'p1', value: 7 } });
            });
        } finally {
            socket2.close();
        }
    });
});
