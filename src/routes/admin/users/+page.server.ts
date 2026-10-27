import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user, session, links, account, member, organization, invitation } from '#lib/server/db/schema.ts';
import { auth } from '#lib/server/auth.ts';
import { hashPassword } from 'better-auth/crypto';
import { createForwardedHeaders } from '#lib/server/ip.ts';
import { eq, desc, and, count, ne } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const operator = event.locals.impersonator || event.locals.user;
	if (!operator || operator.role !== 'admin') {
		throw redirect(302, '/');
	}

	// 1. Fetch all users
	const allUsers = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		})
		.from(user)
		.orderBy(desc(user.createdAt));

	// 2. Fetch link counts per user (via member workspace membership)
	const linkCounts = await db
		.select({
			userId: member.userId,
			total: count(links.id)
		})
		.from(links)
		.innerJoin(member, eq(links.workspaceId, member.organizationId))
		.groupBy(member.userId);

	const linkCountMap = new Map<string, number>();
	for (const lc of linkCounts) {
		if (lc.userId) linkCountMap.set(lc.userId, lc.total);
	}

	// 3. Fetch active session counts per user
	const sessionCounts = await db
		.select({
			userId: session.userId,
			total: count()
		})
		.from(session)
		.groupBy(session.userId);

	const sessionCountMap = new Map<string, number>();
	for (const sc of sessionCounts) {
		if (sc.userId) sessionCountMap.set(sc.userId, sc.total);
	}

	return {
		users: allUsers.map((u) => ({
			...u,
			linksCount: linkCountMap.get(u.id) || 0,
			sessionsCount: sessionCountMap.get(u.id) || 0,
			isSelf: u.id === operator.id
		}))
	};
};

export const actions: Actions = {
	updateRole: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const userId = formData.get('userId')?.toString();
		const newRole = formData.get('role')?.toString();

		if (!userId || !newRole) {
			return fail(400, { message: 'User ID and Role are required.' });
		}

		if (!['admin', 'trusted', 'member', 'suspended'].includes(newRole)) {
			return fail(400, { message: 'Invalid role provided.' });
		}

		if (userId === operator.id && newRole !== 'admin') {
			return fail(400, { message: 'You cannot demote your own administrator account.' });
		}

		await db
			.update(user)
			.set({ role: newRole, updatedAt: new Date() })
			.where(eq(user.id, userId));

		// If user was suspended, revoke their active sessions immediately
		if (newRole === 'suspended') {
			await db.delete(session).where(eq(session.userId, userId));
		}

		return { success: true, message: `User role updated to ${newRole.toUpperCase()}.` };
	},

	resetPassword: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const userId = formData.get('userId')?.toString();
		const newPassword = formData.get('newPassword')?.toString();

		if (!userId || !newPassword) {
			return fail(400, { message: 'User ID and new password are required.' });
		}

		if (newPassword.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters long.' });
		}

		const hashedPassword = await hashPassword(newPassword);

		await db
			.update(account)
			.set({ password: hashedPassword, updatedAt: new Date() })
			.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));

		// Invalidate active sessions for that user to require re-login
		await db.delete(session).where(eq(session.userId, userId));

		return { success: true, message: 'Password has been updated. The user must sign in with their new password.' };
	},

	sendResetEmail: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const userEmail = formData.get('email')?.toString().trim().toLowerCase();

		if (!userEmail) {
			return fail(400, { message: 'Target user email is required.' });
		}

		const headers = createForwardedHeaders(event);

		try {
			await auth.api.requestPasswordReset({
				body: {
					email: userEmail,
					redirectTo: `${event.url.origin}/reset-password`
				},
				headers
			});

			return { success: true, message: `Password reset email dispatched to ${userEmail}.` };
		} catch (err: any) {
			return fail(500, { message: err.message || 'Failed to dispatch reset email.' });
		}
	},

	revokeSessions: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) return fail(400, { message: 'User ID required.' });

		await db.delete(session).where(eq(session.userId, userId));
		return { success: true, message: 'All active sessions for this user have been terminated.' };
	},

	deleteUser: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) return fail(400, { message: 'User ID required.' });

		if (userId === operator.id) {
			return fail(400, { message: 'You cannot delete your own account while logged in.' });
		}

		// Find organizations where this user is a member
		const userMemberships = await db
			.select({ orgId: member.organizationId })
			.from(member)
			.where(eq(member.userId, userId));

		// For each organization, if this user is the only member, delete organization (cascades to links, domains, etc.)
		for (const m of userMemberships) {
			const otherMembers = await db
				.select({ total: count() })
				.from(member)
				.where(and(eq(member.organizationId, m.orgId), ne(member.userId, userId)));
			if ((otherMembers[0]?.total ?? 0) === 0) {
				await db.delete(organization).where(eq(organization.id, m.orgId));
			}
		}

		// Cascade delete user data
		await db.delete(session).where(eq(session.userId, userId));
		await db.delete(account).where(eq(account.userId, userId));
		await db.delete(invitation).where(eq(invitation.inviterId, userId));
		await db.delete(member).where(eq(member.userId, userId));
		await db.delete(user).where(eq(user.id, userId));

		return { success: true, message: 'User and all associated data permanently deleted.' };
	}
};
