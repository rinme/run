import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { member } from '#lib/server/db/schema.ts';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => ({}));
	const workspaceId = body.workspaceId;

	if (!workspaceId || typeof workspaceId !== 'string') {
		return json({ error: 'Missing workspaceId' }, { status: 400 });
	}

	// Verify membership
	const [membership] = await db
		.select()
		.from(member)
		.where(and(eq(member.userId, locals.user.id), eq(member.organizationId, workspaceId)))
		.limit(1);

	if (!membership) {
		return json({ error: 'You do not have access to this workspace' }, { status: 403 });
	}

	// Set active workspace cookie
	cookies.set('run_active_workspace', workspaceId, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});

	return json({ success: true, workspaceId });
};
