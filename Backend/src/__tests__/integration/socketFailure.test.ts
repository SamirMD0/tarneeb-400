import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as Client } from 'socket.io-client';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { AddressInfo } from 'net';
import express from 'express';
import { registerHandlers } from '../../sockets/socketHandlers.js';
import { socketConnectionLimiter } from '../../middlewares/rateLimiter.js';

describe('Socket Integration Failure Modes', () => {
    let io: Server;
    let server: any;
    let clientSocket: any;
    let port: number;

    before(async () => {
        const app = express();
        server = createServer(app);
        io = new Server(server);

        // Register handlers
        registerHandlers(io);

        // Wire rate limiter manually for this test instance since it's usually in socketServer.ts
        io.use(async (socket, next) => {
            try {
                await socketConnectionLimiter.consume(socket.handshake.address);
                next();
            } catch (e) {
                next(new Error('Too many connection attempts, please try again later'));
            }
        });

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
        clientSocket = Client(`http://localhost:${port}`);

        await new Promise<void>((resolve) => clientSocket.on('connect', resolve));

        // 1. Create a room first to get a roomId
        clientSocket.emit('create_room', { config: {} });

        const roomCreated: any = await new Promise((resolve) => clientSocket.on('room_created', resolve));
        const roomId = roomCreated.roomId;

        // 2. Send malformed action (missing type)
        return new Promise<void>((resolve, reject) => {
            clientSocket.on('error', (err: any) => {
                try {
                    assert.equal(err.code, 'VALIDATION_ERROR');
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });

            // Invalid payload
            clientSocket.emit('game_action', { invalid: 'payload' });
        });
    });

    it('should reject actions when not in a room', async () => {
        // New client, not in any room
        const socket2 = Client(`http://localhost:${port}`);
        await new Promise<void>((resolve) => socket2.on('connect', resolve));

        return new Promise<void>((resolve, reject) => {
            socket2.on('error', (err: any) => {
                try {
                    assert.equal(err.code, 'NOT_IN_ROOM');
                    socket2.close();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });

            socket2.emit('game_action', { action: { type: 'BID', value: 7 } });
        });
    });
});
