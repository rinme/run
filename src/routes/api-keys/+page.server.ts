import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { apiKeys } from '#lib/server/db/schema.ts';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allKeys = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			scopes: apiKeys.scopes,
			createdAt: apiKeys.createdAt,
			lastUsedAt: apiKeys.lastUsedAt
		})
		.from(apiKeys)
		.orderBy(desc(apiKeys.createdAt));

	return {
		keys: allKeys
	};
};
