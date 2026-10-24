import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links } from '#lib/server/db/schema.ts';
import { sql, desc, eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { activeWorkspace } = await parent();
	const workspaceId = activeWorkspace?.id;

	const whereClause = workspaceId
		? and(eq(links.isArchived, false), eq(links.workspaceId, workspaceId))
		: eq(links.isArchived, false);

	const allLinks = await db
		.select({
			id: links.id,
			slug: links.slug,
			title: links.title,
			destinationUrl: links.destinationUrl,
			currentClicks: links.currentClicks
		})
		.from(links)
		.where(whereClause)
		.orderBy(desc(links.currentClicks))
		.limit(10);

	const totalClicksResult = await db
		.select({
			total: sql<number>`sum(${links.currentClicks})`
		})
		.from(links)
		.where(whereClause);

	return {
		topLinks: allLinks,
		totalClicks: Number(totalClicksResult[0]?.total || 0)
	};
};
