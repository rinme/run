import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links } from '#lib/server/db/schema.ts';
import { sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allLinks = await db
		.select({
			id: links.id,
			slug: links.slug,
			title: links.title,
			destinationUrl: links.destinationUrl,
			currentClicks: links.currentClicks
		})
		.from(links)
		.orderBy(desc(links.currentClicks))
		.limit(10);

	const totalClicksResult = await db
		.select({
			total: sql<number>`sum(${links.currentClicks})`
		})
		.from(links);

	return {
		topLinks: allLinks,
		totalClicks: Number(totalClicksResult[0]?.total || 0)
	};
};
