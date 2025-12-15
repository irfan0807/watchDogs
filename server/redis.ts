import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redisClient.on("connect", () => {
  console.log("✓ Redis connected");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

// Cache utilities
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setex(key, ttlSeconds, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    await redisClient.del(key);
  },

  async exists(key: string): Promise<boolean> {
    return (await redisClient.exists(key)) === 1;
  },

  // For user sessions and online status
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    await redisClient.hset("users:online", userId, socketId);
  },

  async getUserSocket(userId: string): Promise<string | null> {
    return await redisClient.hget("users:online", userId);
  },

  async removeUserOnline(userId: string): Promise<void> {
    await redisClient.hdel("users:online", userId);
  },

  async getAllOnlineUsers(): Promise<Record<string, string>> {
    return await redisClient.hgetall("users:online");
  },
};

export default redisClient;
