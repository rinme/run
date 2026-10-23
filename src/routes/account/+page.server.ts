import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user, session, inviteCodes } from '#lib/server/db/schema.ts';
import { createInviteCode } from '#lib/server/invites.ts';
import { auth } from '#lib/server/auth.ts';
import { eq, and, desc } from 'drizzle-orm';

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

	// Fetch active sessions for this user
	const userSessions = await db
		.select()
		.from(session)
		.where(eq(session.userId, currentUser.id))
		.orderBy(desc(session.createdAt));

	// Fetch invite codes created by this user if admin or trusted
	let userInvites: typeof inviteCodes.$inferSelect[] = [];
	if (currentUser.role === 'admin' || currentUser.role === 'trusted') {
		userInvites = await db
			.select()
			.from(inviteCodes)
			.where(eq(inviteCodes.creatorId, currentUser.id))
			.orderBy(desc(inviteCodes.createdAt));
	}

	return {
		user: currentUser,
		currentSessionId: event.locals.session?.id,
		sessions: userSessions.map((s) => ({
			id: s.id,
			ipAddress: s.ipAddress || 'Unknown IP',
			userAgent: s.userAgent || 'Unknown Device',
			createdAt: s.createdAt,
			expiresAt: s.expiresAt,
			isCurrent: s.id === event.locals.session?.id
		})),
		invites: userInvites
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
		return { success: true, message: 'Profile updated successfully' };
	},

	revokeSession: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const sessionId = formData.get('sessionId')?.toString();

		if (!sessionId) {
			return fail(400, { message: 'Session ID is required' });
		}

		// Ensure session belongs to user
		await db
			.delete(session)
			.where(and(eq(session.id, sessionId), eq(session.userId, event.locals.user.id)));

		// If current session was revoked, redirect to login
		if (sessionId === event.locals.session?.id) {
			throw redirect(302, '/login');
		}

		return { success: true, message: 'Session revoked' };
	},

	createInvite: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const currentUser = await db
			.select()
			.from(user)
			.where(eq(user.id, event.locals.user.id))
			.get();

		if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'trusted')) {
			return fail(403, { message: 'You do not have permission to generate invite codes.' });
		}

		const formData = await event.request.formData();
		const customCode = formData.get('customCode')?.toString().trim();
		const maxUses = parseInt(formData.get('maxUses')?.toString() || '1', 10);
		const roleToGrant = (formData.get('role')?.toString() as 'member' | 'trusted' | 'admin') || 'member';

		// Only admins can generate admin or trusted invites
		const safeRole = currentUser.role === 'admin' ? roleToGrant : 'member';

		try {
			const newInvite = await createInviteCode({
				code: customCode || undefined,
				maxUses: isNaN(maxUses) ? 1 : maxUses,
				role: safeRole,
				creatorId: currentUser.id
			});

			return { success: true, createdCode: newInvite.code };
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
	},

	signOut: async (event) => {
		if (event.locals.session) {
			await db.delete(session).where(eq(session.id, event.locals.session.id));
		}
		throw redirect(302, '/login');
	}
};
