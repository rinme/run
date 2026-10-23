import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { domains } from '#lib/server/db/schema.ts';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allDomains = await db.select().from(domains).orderBy(desc(domains.createdAt));
	return {
		domains: allDomains
	};
};
