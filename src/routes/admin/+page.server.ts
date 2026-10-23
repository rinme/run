import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import {
	user,
	session,
	links,
	inviteCodes,
	webhooks,
	type InviteCode
} from '#lib/server/db/schema.ts';
import {
	getAllSiteSettings,
	setSiteSetting,
	type SiteGeneralConfig,
	type SiteAuthConfig,
	type SiteEmailConfig,
	type SiteFeaturesConfig
} from '#lib/server/settings.ts';
import { createInviteCode } from '#lib/server/invites.ts';
import { eq, desc, count, sql, and, ne } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	// Guard: Admin only
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	const currentUser = await db
		.select()
		.from(user)
		.where(eq(user.id, event.locals.user.id))
		.get();

	if (!currentUser || currentUser.role !== 'admin') {
		throw redirect(302, '/');
	}

	// 1. Load System Settings
	const settings = await getAllSiteSettings();

	// 2. Load System Stats
	const [userCount] = await db.select({ total: count() }).from(user);
	const [linkCount] = await db.select({ total: count() }).from(links);
	const [sessionCount] = await db.select({ total: count() }).from(session);
	const [inviteCount] = await db.select({ total: count() }).from(inviteCodes);
	const [webhookCount] = await db.select({ total: count() }).from(webhooks);

	// 3. Load All Active Sessions across all users with user metadata
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

	// 4. Load All Invite Codes
	const allInvites = await db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));

	return {
		settings,
		stats: {
			users: userCount.total,
			links: linkCount.total,
			sessions: sessionCount.total,
			invites: inviteCount.total,
			webhooks: webhookCount.total
		},
		sessions: allSessions.map((s) => ({
			...s,
			isCurrent: s.id === event.locals.session?.id
		})),
		invites: allInvites
	};
};

export const actions: Actions = {
	updateGeneral: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const general: SiteGeneralConfig = {
			siteTitle: formData.get('siteTitle')?.toString().trim() || 'Run',
			siteTagline: formData.get('siteTagline')?.toString().trim() || '',
			siteUrl: formData.get('siteUrl')?.toString().trim() || 'http://localhost:5173',
			defaultDomain: formData.get('defaultDomain')?.toString().trim() || 'go.run.link',
			defaultDeliveryMode: formData.get('defaultDeliveryMode')?.toString().trim() || 'direct'
		};

		await setSiteSetting('general', general);
		return { success: true, message: 'General configuration updated' };
	},

	updateAuth: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const authConfig: SiteAuthConfig = {
			registrationMode: (formData.get('registrationMode')?.toString() as any) || 'invite_only',
			requireEmailVerification: formData.get('requireEmailVerification') === 'true',
			allowUserInviteCreation: formData.get('allowUserInviteCreation') === 'true'
		};

		await setSiteSetting('auth', authConfig);
		return { success: true, message: 'Authentication & registration policies updated' };
	},

	updateEmail: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const emailConfig: SiteEmailConfig = {
			provider: (formData.get('provider')?.toString() as any) || 'console',
			smtpHost: formData.get('smtpHost')?.toString().trim() || '',
			smtpPort: parseInt(formData.get('smtpPort')?.toString() || '587', 10),
			smtpUser: formData.get('smtpUser')?.toString().trim() || '',
			smtpPass: formData.get('smtpPass')?.toString() || '',
			fromEmail: formData.get('fromEmail')?.toString().trim() || 'noreply@run.link',
			fromName: formData.get('fromName')?.toString().trim() || 'Run Link Engine',
			resendApiKey: formData.get('resendApiKey')?.toString().trim() || ''
		};

		await setSiteSetting('email', emailConfig);
		return { success: true, message: 'Email & SMTP transport settings updated' };
	},

	updateFeatures: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const featuresConfig: SiteFeaturesConfig = {
			enableWebhooks: formData.get('enableWebhooks') === 'true',
			enableAiSuggestions: formData.get('enableAiSuggestions') === 'true',
			enablePublicStats: formData.get('enablePublicStats') === 'true',
			enableMcpServer: formData.get('enableMcpServer') === 'true',
			enable3dGlobe: formData.get('enable3dGlobe') === 'true',
			changelogRepo: formData.get('changelogRepo')?.toString().trim() || 'rinme/run'
		};

		await setSiteSetting('features', featuresConfig);
		return { success: true, message: 'Feature flags and changelog source updated' };
	},

	revokeSession: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

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
		if (!event.locals.user?.id || !event.locals.session?.id) throw redirect(302, '/login');

		await db.delete(session).where(ne(session.id, event.locals.session.id));
		return { success: true, message: 'All other sessions terminated' };
	},

	createInvite: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const code = formData.get('code')?.toString().trim();
		const maxUses = parseInt(formData.get('maxUses')?.toString() || '1', 10);
		const role = (formData.get('role')?.toString() as any) || 'member';

		try {
			await createInviteCode({
				code: code || undefined,
				maxUses: isNaN(maxUses) ? 1 : maxUses,
				role,
				creatorId: event.locals.user.id
			});
			return { success: true, message: 'Invite code created' };
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
	},

	toggleInvite: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const inviteId = formData.get('inviteId')?.toString();

		if (!inviteId) return fail(400, { message: 'Invite ID required' });

		const [target] = await db.select().from(inviteCodes).where(eq(inviteCodes.id, inviteId)).limit(1);
		if (target) {
			await db
				.update(inviteCodes)
				.set({ isActive: !target.isActive })
				.where(eq(inviteCodes.id, inviteId));
		}

		return { success: true, message: 'Invite code status toggled' };
	},

	deleteInvite: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const inviteId = formData.get('inviteId')?.toString();

		if (!inviteId) return fail(400, { message: 'Invite ID required' });

		await db.delete(inviteCodes).where(eq(inviteCodes.id, inviteId));
		return { success: true, message: 'Invite code deleted' };
	}
};
