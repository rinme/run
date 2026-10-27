import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user as userTable } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	// Guard: Requesting operator must be admin (or original admin currently impersonating)
	const operator = event.locals.impersonator || event.locals.user;
	if (!operator || operator.role !== 'admin') {
		return json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
	}

	let targetUserId = '';
	const contentType = event.request.headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		const body = await event.request.json();
		targetUserId = body.userId || '';
	} else {
		const form = await event.request.formData();
		targetUserId = form.get('userId')?.toString() || '';
	}

	if (!targetUserId) {
		return json({ error: 'Target user ID is required.' }, { status: 400 });
	}

	const [targetUser] = await db
		.select()
		.from(userTable)
		.where(eq(userTable.id, targetUserId))
		.limit(1);

	if (!targetUser) {
		return json({ error: 'Target user not found.' }, { status: 404 });
	}

	// Security guard: Prevent impersonating other Super Administrators
	if (targetUser.role === 'admin') {
		return json({ error: 'Security restriction: Cannot spectate another Administrator account.' }, { status: 403 });
	}

	// Set impersonation cookie
	event.cookies.set('run_impersonate_target_id', targetUser.id, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: 60 * 60 * 12 // 12 hours
	});

	return json({
		success: true,
		message: `Now spectating as ${targetUser.name || targetUser.email}`,
		user: {
			id: targetUser.id,
			name: targetUser.name,
			email: targetUser.email,
			role: targetUser.role
		}
	});
};
