import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links } from '#lib/server/db/schema.ts';
import { sql, desc, eq, and } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	let totalClicks = 0;
	let tinybirdUrl = (process.env.TINYBIRD_API_URL || process.env.TINYBIRD_URL || '').replace(/\/+$/, '');
	let tinybirdToken = (process.env.TINYBIRD_TOKEN || '').trim();

	try {
		const privateEnv = (await import('$app/env/private')) as unknown as Record<string, string | undefined>;
		if (privateEnv?.TINYBIRD_API_URL || privateEnv?.TINYBIRD_URL) {
			tinybirdUrl = (privateEnv.TINYBIRD_API_URL || privateEnv.TINYBIRD_URL || '').replace(/\/+$/, '');
		}
		if (privateEnv?.TINYBIRD_TOKEN) tinybirdToken = privateEnv.TINYBIRD_TOKEN.trim();
	} catch {}

	// 1. Fetch real aggregate clicks from Tinybird if available
	if (tinybirdUrl && tinybirdToken) {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 2000);
			const res = await fetch(`${tinybirdUrl}/v0/pipes/analytics_overview.json`, {
				headers: { Authorization: `Bearer ${tinybirdToken}` },
				signal: controller.signal
			});
			clearTimeout(timeout);

			if (res.ok) {
				const tbData = await res.json();
				const firstRow = Array.isArray(tbData?.data) ? tbData.data[0] : null;
				if (firstRow?.totalClicks !== undefined) {
					totalClicks = Number(firstRow.totalClicks || 0);
				}
			}
		} catch (e) {
			console.warn('Tinybird fetch error in analytics page:', e);
		}
	}

	// 2. Fetch top links and fallback clicks from database safely
	try {
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

		if (!totalClicks) {
			const totalClicksResult = await db
				.select({
					total: sql<number>`sum(${links.currentClicks})`
				})
				.from(links)
				.where(whereClause);

			totalClicks = Number(totalClicksResult[0]?.total || 0);
		}

		return {
			topLinks: allLinks || [],
			totalClicks
		};
	} catch (err) {
		console.error('Error loading analytics page DB data:', err);
		return {
			topLinks: [],
			totalClicks: totalClicks || 0
		};
	}
};
