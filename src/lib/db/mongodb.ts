import mongoose from "mongoose";

/**
 * Next dev reloads modules on every edit, and serverless invocations reuse the
 * process — both would open a new pool each time. Cache the connection on
 * globalThis so we keep exactly one across reloads.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  _mongoose?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose._mongoose ?? {
  conn: null,
  promise: null,
};
globalForMongoose._mongoose = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  // Read at call time, not module scope: importing a model must not throw
  // during build when env vars aren't present.
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      family: 4,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Clear the rejected promise so the next request retries instead of
    // permanently resolving to the same failure.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
