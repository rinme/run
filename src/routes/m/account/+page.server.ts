import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user, session } from '#lib/server/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	const currentUser = await db
		.select()
		.from(user)
		.where(eq(user.id, event.locals.user.id))
		.get();

	if (!currentUser) {
		throw redirect(302, '/login');
	}

	const userSessions = await db
		.select()
		.from(session)
		.where(eq(session.userId, currentUser.id))
		.orderBy(desc(session.createdAt))
		.limit(5);

	return {
		user: currentUser,
		currentSessionId: event.locals.session?.id,
		sessions: userSessions.map((s) => ({
			id: s.id,
			ipAddress: s.ipAddress || 'Unknown IP',
			userAgent: s.userAgent || 'Unknown Device',
			createdAt: s.createdAt,
			isCurrent: s.id === event.locals.session?.id
		}))
	};
};

export const actions: Actions = {
	updateProfile: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim();

		if (!name) {
			return fail(400, { message: 'Name cannot be empty' });
		}

		await db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, event.locals.user.id));
		return { success: true, message: 'Profile updated' };
	},

	signOut: async (event) => {
		if (event.locals.session) {
			await db.delete(session).where(eq(session.id, event.locals.session.id));
		}
		throw redirect(302, '/login');
	}
};
