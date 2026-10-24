import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { domains, links } from '#lib/server/db/schema.ts';
import { eq, desc, and, or, isNull, isNotNull, gt, lte } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const allDomains = await db.select().from(domains).orderBy(desc(domains.createdAt));

	const now = new Date();
	const [activeCount, expiredCount, totalCount] = await Promise.all([
		db
			.select({ id: links.id })
			.from(links)
			.where(and(eq(links.isArchived, false), or(isNull(links.expiresAt), gt(links.expiresAt, now)))),
		db
			.select({ id: links.id })
			.from(links)
			.where(and(eq(links.isArchived, false), and(isNotNull(links.expiresAt), lte(links.expiresAt, now)))),
		db
			.select({ id: links.id })
			.from(links)
			.where(eq(links.isArchived, false))
	]);

	return {
		domains: allDomains,
		stats: {
			total: totalCount.length,
			active: activeCount.length,
			expired: expiredCount.length
		}
	};
};
