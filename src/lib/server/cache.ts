import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';
import type { Link, Domain } from './db/schema';

let redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || '';
let redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';

try {
	const privateEnv = (await import('$app/env/private')) as Record<string, any>;
	if (privateEnv.REDIS_URL) redisUrl = privateEnv.REDIS_URL;
	else if (privateEnv.UPSTASH_REDIS_REST_URL) redisUrl = privateEnv.UPSTASH_REDIS_REST_URL;
	if (privateEnv.UPSTASH_REDIS_REST_TOKEN) redisToken = privateEnv.UPSTASH_REDIS_REST_TOKEN;
} catch {}

export interface ResolvedLinkData {
	link: Link;
	domain: Domain | null;
}

const memoryCache = new Map<string, { data: ResolvedLinkData; expiresAt: number }>();

interface RedisAdapter {
	get(key: string): Promise<ResolvedLinkData | null>;
	set(key: string, data: ResolvedLinkData, ttl: number): Promise<void>;
	del(key: string): Promise<void>;
}

let adapter: RedisAdapter | null = null;

// Option 1: Standard TCP Redis URL (redis:// or rediss:// from Redis Cloud, AWS, self-hosted, etc.)
if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
	try {
		const io = new IORedis(redisUrl, {
			maxRetriesPerRequest: 1,
			connectTimeout: 3000,
			lazyConnect: true,
			retryStrategy(times) {
				if (times > 2) return null; // cease reconnection attempts quickly in serverless
				return Math.min(times * 150, 600);
			}
		});

		io.on('error', (err) => {
			console.warn('[Cache] TCP Redis notice:', err.message);
		});

		adapter = {
			async get(key: string) {
				const str = await io.get(key);
				if (!str) return null;
				return JSON.parse(str) as ResolvedLinkData;
			},
			async set(key: string, data: ResolvedLinkData, ttl: number) {
				await io.set(key, JSON.stringify(data), 'EX', ttl);
			},
			async del(key: string) {
				await io.del(key);
			}
		};
	} catch (e) {
		console.warn('Failed to initialize TCP Redis (ioredis), falling back to memory cache:', e);
	}
}
// Option 2: Upstash HTTP REST Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
else if (redisUrl && redisToken) {
	try {
		const upstash = new UpstashRedis({
			url: redisUrl,
			token: redisToken
		});

		adapter = {
			async get(key: string) {
				const val = await upstash.get<ResolvedLinkData>(key);
				return val ?? null;
			},
			async set(key: string, data: ResolvedLinkData, ttl: number) {
				await upstash.set(key, data, { ex: ttl });
			},
			async del(key: string) {
				await upstash.del(key);
			}
		};
	} catch (e) {
		console.warn('Failed to initialize Upstash Redis, falling back to memory cache:', e);
	}
}

function getCacheKey(domain: string | null | undefined, slug: string): string {
	const normalizedDomain = domain ? domain.toLowerCase().trim() : '_default_';
	return `run:link:${normalizedDomain}:${slug.toLowerCase().trim()}`;
}

export const linkCache = {
	async get(domain: string | null | undefined, slug: string): Promise<ResolvedLinkData | null> {
		const key = getCacheKey(domain, slug);

		if (adapter) {
			try {
				const val = await adapter.get(key);
				if (val) return val;
			} catch (e) {
				console.error('[Cache] Redis get error, checking memory fallback:', e);
			}
		}

		// Fallback memory cache
		const memItem = memoryCache.get(key);
		if (memItem) {
			if (Date.now() < memItem.expiresAt) {
				return memItem.data;
			}
			memoryCache.delete(key);
		}

		return null;
	},

	async set(
		domain: string | null | undefined,
		slug: string,
		data: ResolvedLinkData,
		ttlSeconds = 300
	): Promise<void> {
		const key = getCacheKey(domain, slug);

		if (adapter) {
			try {
				await adapter.set(key, data, ttlSeconds);
				return;
			} catch (e) {
				console.error('[Cache] Redis set error, saving to memory fallback:', e);
			}
		}

		memoryCache.set(key, {
			data,
			expiresAt: Date.now() + ttlSeconds * 1000
		});
	},

	async invalidate(domain: string | null | undefined, slug: string): Promise<void> {
		const key = getCacheKey(domain, slug);

		if (adapter) {
			try {
				await adapter.del(key);
			} catch (e) {
				console.error('[Cache] Redis del error:', e);
			}
		}

		memoryCache.delete(key);
	}
};
