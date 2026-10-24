import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links } from '#lib/server/db/schema.ts';
import { sql, desc, eq, and } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const { activeWorkspace } = await parent();
	const workspaceId = activeWorkspace?.id;

	const whereClause = workspaceId
		? and(eq(links.isArchived, false), eq(links.workspaceId, workspaceId))
		: eq(links.isArchived, false);

	const topLinks = await db
		.select({
			id: links.id,
			slug: links.slug,
			title: links.title,
			destinationUrl: links.destinationUrl,
			currentClicks: links.currentClicks,
			createdAt: links.createdAt
		})
		.from(links)
		.where(whereClause)
		.orderBy(desc(links.currentClicks))
		.limit(15);

	const totalClicksResult = await db
		.select({
			total: sql<number>`sum(${links.currentClicks})`,
			count: sql<number>`count(${links.id})`
		})
		.from(links)
		.where(whereClause);

	return {
		topLinks,
		totalClicks: Number(totalClicksResult[0]?.total || 0),
		totalLinks: Number(totalClicksResult[0]?.count || 0)
	};
};
