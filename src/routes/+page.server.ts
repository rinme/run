import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { links, domains } from '#lib/server/db/schema.ts';
import { desc, eq, and, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const { activeWorkspace } = await parent();
	const workspaceId = activeWorkspace?.id;

	const linkWhere = workspaceId
		? and(eq(links.isArchived, false), eq(links.workspaceId, workspaceId))
		: eq(links.isArchived, false);

	const allLinks = await db
		.select()
		.from(links)
		.where(linkWhere)
		.orderBy(desc(links.createdAt))
		.limit(50);

	const statsResult = await db
		.select({
			totalClicks: sql<number>`sum(${links.currentClicks})`
		})
		.from(links)
		.where(linkWhere);

	const allDomains = workspaceId
		? await db.select().from(domains).where(eq(domains.workspaceId, workspaceId))
		: await db.select().from(domains);

	return {
		links: allLinks,
		domains: allDomains,
		totalClicks: Number(statsResult[0]?.totalClicks || 0),
		user: locals.user,
		session: locals.session
	};
};
