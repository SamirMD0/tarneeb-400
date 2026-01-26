import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not defined');
}

const isProduction = process.env.NODE_ENV === 'production';

const mongooseOptions: mongoose.ConnectOptions = {
    autoIndex: !isProduction, // Disable autoIndex in production
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

let isConnected = false;

export async function connectMongo(): Promise<typeof mongoose> {
    if (isConnected) {
        return mongoose;
    }

    try {
        const conn = await mongoose.connect(MONGO_URI as string, mongooseOptions);
        isConnected = true;
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

export async function disconnectMongo(): Promise<void> {
    if (!isConnected) return;
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected');
}

export async function pingMongo(): Promise<boolean> {
    try {
        if (!mongoose.connection.db) return false;
        await mongoose.connection.db.admin().ping();
        return true;
    } catch {
        return false;
    }
}

export { mongoose };
