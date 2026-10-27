import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user, session } from '#lib/server/db/schema.ts';
import { eq, desc, ne } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const operator = event.locals.impersonator || event.locals.user;
	if (!operator || operator.role !== 'admin') throw redirect(302, '/');

	const allSessions = await db
		.select({
			id: session.id,
			userId: session.userId,
			userName: user.name,
			userEmail: user.email,
			userRole: user.role,
			ipAddress: session.ipAddress,
			userAgent: session.userAgent,
			createdAt: session.createdAt,
			expiresAt: session.expiresAt
		})
		.from(session)
		.leftJoin(user, eq(session.userId, user.id))
		.orderBy(desc(session.createdAt));

	return {
		sessions: allSessions.map((s) => ({
			...s,
			isCurrent: s.id === event.locals.session?.id
		}))
	};
};

export const actions: Actions = {
	revokeSession: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const sessionId = formData.get('sessionId')?.toString();

		if (!sessionId) return fail(400, { message: 'Session ID required' });

		await db.delete(session).where(eq(session.id, sessionId));

		if (sessionId === event.locals.session?.id) {
			throw redirect(302, '/login');
		}

		return { success: true, message: 'Session terminated' };
	},

	revokeAllOtherSessions: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin' || !event.locals.session?.id) throw redirect(302, '/login');

		await db.delete(session).where(ne(session.id, event.locals.session.id));
		return { success: true, message: 'All other sessions across the instance terminated' };
	}
};
