import { createClient } from "redis";

async function run() {
    const client = createClient();
    await client.connect();
    
    const activeRooms = await client.sMembers('active_rooms');
    console.log('active_rooms:', activeRooms);
    
    if (activeRooms.length > 0) {
        const keys = activeRooms.map(id => `room:${id}`);
        const values = await client.mGet(keys);
        values.forEach((v, i) => {
            console.log(`Key: ${keys[i]}`);
            console.log(`Value:`, v);
        });
    } else {
        console.log('No active rooms found in set');
        
        // Scan for keys just in case
        const { keys } = await client.scan(0, { MATCH: 'room:*' });
        console.log('Keys matching room:* ->', keys);
        if (keys.length > 0) {
            const vals = await client.mGet(keys);
            console.log('Values:', vals);
        }
    }
    await client.quit();
}

run().catch(console.error);
