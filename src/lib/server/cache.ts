import { Redis } from '@upstash/redis';
import type { Link, Domain } from './db/schema';

let redisUrl = process.env.UPSTASH_REDIS_REST_URL || '';
let redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';

try {
	const privateEnv = await import('$app/env/private');
	if (privateEnv.UPSTASH_REDIS_REST_URL) redisUrl = privateEnv.UPSTASH_REDIS_REST_URL;
	if (privateEnv.UPSTASH_REDIS_REST_TOKEN) redisToken = privateEnv.UPSTASH_REDIS_REST_TOKEN;
} catch {}

export interface ResolvedLinkData {
	link: Link;
	domain: Domain | null;
}

const memoryCache = new Map<string, { data: ResolvedLinkData; expiresAt: number }>();

let redisClient: Redis | null = null;
if (redisUrl && redisToken) {
	try {
		redisClient = new Redis({
			url: redisUrl,
			token: redisToken
		});
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

		if (redisClient) {
			try {
				const val = await redisClient.get<ResolvedLinkData>(key);
				if (val) return val;
			} catch (e) {
				console.error('Redis get error:', e);
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

		if (redisClient) {
			try {
				await redisClient.set(key, data, { ex: ttlSeconds });
				return;
			} catch (e) {
				console.error('Redis set error:', e);
			}
		}

		memoryCache.set(key, {
			data,
			expiresAt: Date.now() + ttlSeconds * 1000
		});
	},

	async invalidate(domain: string | null | undefined, slug: string): Promise<void> {
		const key = getCacheKey(domain, slug);

		if (redisClient) {
			try {
				await redisClient.del(key);
			} catch (e) {
				console.error('Redis del error:', e);
			}
		}

		memoryCache.delete(key);
	}
};
