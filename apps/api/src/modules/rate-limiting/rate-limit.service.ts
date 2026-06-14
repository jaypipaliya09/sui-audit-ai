import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const PLAN_LIMITS = {
  FREE:          { perMinute: 2,   perHour: 5,    perDay: 10   },
  PAY_AS_YOU_GO: { perMinute: 5,   perHour: 20,   perDay: 50   },
  DEVELOPER:     { perMinute: 10,  perHour: 50,   perDay: 150  },
  TEAM:          { perMinute: 30,  perHour: 200,  perDay: 500  },
  ENTERPRISE:    { perMinute: 100, perHour: 1000, perDay: 5000 },
};

@Injectable()
export class RateLimitService {
  private readonly redis: Redis;
  private readonly logger = new Logger(RateLimitService.name);

  // Lua script to atomically increment multiple keys and set expiry on first increment
  // KEYS[1] = minute_key, KEYS[2] = hour_key, KEYS[3] = day_key
  // ARGV[1] = minute_limit, ARGV[2] = hour_limit, ARGV[3] = day_limit
  private readonly LUA_SCRIPT = `
    local current_minute = tonumber(redis.call("GET", KEYS[1]) or "0")
    if current_minute >= tonumber(ARGV[1]) then
      return {0, tonumber(ARGV[1]), tonumber(ARGV[1]) - current_minute}
    end

    local current_hour = tonumber(redis.call("GET", KEYS[2]) or "0")
    if current_hour >= tonumber(ARGV[2]) then
      return {0, tonumber(ARGV[2]), tonumber(ARGV[2]) - current_hour}
    end

    local current_day = tonumber(redis.call("GET", KEYS[3]) or "0")
    if current_day >= tonumber(ARGV[3]) then
      return {0, tonumber(ARGV[3]), tonumber(ARGV[3]) - current_day}
    end

    local m = redis.call("INCR", KEYS[1])
    if m == 1 then redis.call("EXPIRE", KEYS[1], 60) end

    local h = redis.call("INCR", KEYS[2])
    if h == 1 then redis.call("EXPIRE", KEYS[2], 3600) end

    local d = redis.call("INCR", KEYS[3])
    if d == 1 then redis.call("EXPIRE", KEYS[3], 86400) end

    return {1, tonumber(ARGV[1]), tonumber(ARGV[1]) - m}
  `;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    this.redis = new Redis({ host, port });
  }

  async checkAndIncrement(userId: string, plan: string = 'FREE') {
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.FREE;
    
    const now = Date.now();
    const epochMinute = Math.floor(now / 60000);
    const epochHour = Math.floor(now / 3600000);
    const epochDay = Math.floor(now / 86400000);

    const keys = [
      `rl:${userId}:minute:${epochMinute}`,
      `rl:${userId}:hour:${epochHour}`,
      `rl:${userId}:day:${epochDay}`,
    ];

    const args = [
      limits.perMinute,
      limits.perHour,
      limits.perDay,
    ];

    const result = await this.redis.eval(this.LUA_SCRIPT, 3, ...keys, ...args) as number[];
    
    const allowed = result[0] === 1;
    const limit = result[1];
    const remaining = result[2];

    return {
      allowed,
      limit,
      remaining: remaining < 0 ? 0 : remaining,
      resetAt: new Date((epochMinute + 1) * 60000),
    };
  }
}
