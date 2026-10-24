import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links } from '#lib/server/db/schema.ts';
import { authenticateApiRequest, getOrCreateDefaultWorkspace } from '#lib/server/api-auth.ts';
import { convertRunToSinkLink, type RunExportData, type SinkExportData } from '#lib/server/migration.ts';
import { eq, and, or, isNull, isNotNull, gt, lte, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ request, url, locals }) => {
	const auth = await authenticateApiRequest(request, locals);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const workspaceId = auth.workspaceId || (await getOrCreateDefaultWorkspace(auth.userId));
	const format = url.searchParams.get('format')?.toLowerCase() === 'sink' ? 'sink' : 'run';
	const status = url.searchParams.get('status')?.toLowerCase() || 'all';

	const now = new Date();
	const conditions = [eq(links.isArchived, false)];

	if (workspaceId) {
		conditions.push(eq(links.workspaceId, workspaceId));
	}

	if (status === 'active') {
		conditions.push(or(isNull(links.expiresAt), gt(links.expiresAt, now))!);
	} else if (status === 'expired') {
		conditions.push(and(isNotNull(links.expiresAt), lte(links.expiresAt, now))!);
	}

	const allLinks = await db
		.select()
		.from(links)
		.where(and(...conditions))
		.orderBy(desc(links.createdAt));

	const dateStr = new Date().toISOString().slice(0, 10);

	if (format === 'sink') {
		const sinkLinks = allLinks.map(convertRunToSinkLink);
		const payload: SinkExportData = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			count: sinkLinks.length,
			links: sinkLinks,
			list_complete: true
		};

		return new Response(JSON.stringify(payload, null, 2), {
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="sink-links-${dateStr}.json"`,
				'Cache-Control': 'no-store'
			}
		});
	}

	// Native Run Format
	const payload: RunExportData = {
		version: '2.2.0',
		exportedAt: new Date().toISOString(),
		generator: 'run',
		count: allLinks.length,
		links: allLinks
	};

	return new Response(JSON.stringify(payload, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="run-links-export-${dateStr}.json"`,
			'Cache-Control': 'no-store'
		}
	});
};
