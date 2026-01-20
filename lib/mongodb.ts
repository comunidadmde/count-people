import { MongoClient, Db, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri: string = process.env.MONGODB_URI;

// Determine if this is an Atlas connection (mongodb+srv://)
const isAtlas = uri.startsWith('mongodb+srv://');

// Configure MongoDB connection options
// Note: For Atlas (mongodb+srv://), TLS is automatically enabled
const options: MongoClientOptions = {
  // Increase connection timeout for better reliability
  serverSelectionTimeoutMS: 30000,
  // Retry writes
  retryWrites: true,
  // Connection pool options
  maxPoolSize: 10,
  minPoolSize: 1,
  // Socket timeout
  socketTimeoutMS: 45000,
  // For local MongoDB (non-Atlas), we don't need TLS
  // For Atlas, TLS is handled automatically by the driver
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDatabase(): Promise<Db> {
  try {
    const client = await clientPromise;
    // Test the connection
    await client.db().admin().ping();
    return client.db();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error(
      `Failed to connect to MongoDB. Please check your MONGODB_URI in .env.local. ` +
      `If using MongoDB Atlas, ensure your IP address is whitelisted and the connection string is correct.`
    );
  }
}

export default clientPromise;
