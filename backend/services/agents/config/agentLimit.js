import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

const Limits = {
  chat: 20,
  coding: 5,
  pdf: 5,
  ppt: 5,
  image: 3,
  search: 5,
};

export const checkAgentLimit = async (userId, agent) => {
  const max = Limits[agent] ?? Limits.chat;

  const key = `rate:${userId}:${agent}`;

  const count = await redis.incr(key);

  // Start a 60-second window on the first request
  if (count === 1) {
    await redis.expire(key, 60);
  }

  const ttl = await redis.ttl(key);

  // User exceeded the limit
  if (count > max) {
    const minutes = Math.floor(ttl / 60);
    const seconds = ttl % 60;

    let retryAfter;

    if (minutes > 0) {
      retryAfter = `${minutes}m ${seconds}s`;
    } else {
      retryAfter = `${seconds}s`;
    }

    const error = new Error(
      `Rate limit exceeded for ${agent}`
    );

    error.status = 429;

    error.data = {
      success: false,
      agent,
      limit: max,
      remaining: 0,
      remainingTime: ttl,
      retryAfter,
      message: `You have reached the ${agent} limit (${max} requests/minute). Try again in ${retryAfter}`,
    };

    throw error;
  }

  return {
    success: true,
    remaining: max - count,
    limit: max,
    remainingTime: ttl,
  };
};