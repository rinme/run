import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { links, domains } from '#lib/server/db/schema.ts';
import { desc, eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const allLinks = await db
		.select()
		.from(links)
		.where(eq(links.isArchived, false))
		.orderBy(desc(links.createdAt))
		.limit(50);

	const statsResult = await db
		.select({
			totalClicks: sql<number>`sum(${links.currentClicks})`
		})
		.from(links);

	const allDomains = await db.select().from(domains);

	return {
		links: allLinks,
		domains: allDomains,
		totalClicks: Number(statsResult[0]?.totalClicks || 0)
	};
};
