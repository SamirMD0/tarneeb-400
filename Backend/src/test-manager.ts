import { RoomManager } from './rooms/roomManager.js';
import { roomCache } from './cache/roomCache.js';
import { redis } from './lib/redis.js';

async function run() {
    await redis.connect();
    const manager = new RoomManager();
    await manager.initialize();
    
    console.log("Memory rooms:", manager['rooms'].size);
    const waiting = await manager.getWaitingRooms();
    console.log("Waiting rooms:", waiting.map(r => r.id));
    
    await redis.disconnect();
}

run().catch(console.error);
