import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import {
	user,
	session,
	links,
	domains,
	utmTemplates,
	inviteCodes,
	siteSettings,
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
import { sendInviteEmail, sendTestEmail } from '#lib/server/email.ts';
import { DATASET_METADATA } from '#lib/server/backup-service.ts';
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
	if (settings.general.siteUrl === 'http://localhost:5173') {
		settings.general.siteUrl = process.env.ORIGIN || event.url.origin;
	}
	if (settings.general.defaultDomain === 'go.run.link') {
		settings.general.defaultDomain = event.url.host;
	}

	// 2. Load System Stats
	const [userCount] = await db.select({ total: count() }).from(user);
	const [linkCount] = await db.select({ total: count() }).from(links);
	const [sessionCount] = await db.select({ total: count() }).from(session);
	const [inviteCount] = await db.select({ total: count() }).from(inviteCodes);
	const [webhookCount] = await db.select({ total: count() }).from(webhooks);
	const [domainCount] = await db.select({ total: count() }).from(domains);
	const [utmCount] = await db.select({ total: count() }).from(utmTemplates);
	const [settingsCount] = await db.select({ total: count() }).from(siteSettings);

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
			webhooks: webhookCount.total,
			domains: domainCount.total,
			utmTemplates: utmCount.total,
			siteSettings: settingsCount.total
		},
		backupStats: {
			links: linkCount.total,
			domains: domainCount.total,
			utmTemplates: utmCount.total,
			webhooks: webhookCount.total,
			siteSettings: settingsCount.total,
			inviteCodes: inviteCount.total
		},
		datasetMetadata: DATASET_METADATA,
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
			siteUrl: formData.get('siteUrl')?.toString().trim() || event.url.origin,
			defaultDomain: formData.get('defaultDomain')?.toString().trim() || event.url.host,
			defaultDeliveryMode: formData.get('defaultDeliveryMode')?.toString().trim() || 'direct',
			customDomainCnameTarget: formData.get('customDomainCnameTarget')?.toString().trim() || ''
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
			fromName: formData.get('fromName')?.toString().trim() || 'Run',
			resendApiKey: formData.get('resendApiKey')?.toString().trim() || ''
		};

		await setSiteSetting('email', emailConfig);
		return { success: true, message: 'Email & SMTP transport settings updated' };
	},

	testEmail: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const recipient =
			formData.get('testRecipient')?.toString().trim() ||
			event.locals.user.email ||
			'';

		if (!recipient || !recipient.includes('@')) {
			return fail(400, { message: 'A valid email address is required for the test email' });
		}

		try {
			const result = await sendTestEmail(recipient);
			if (!result.success) {
				return fail(400, { message: `Email dispatch failed (${result.provider}): ${result.error}` });
			}
			return {
				success: true,
				message: `Test email sent to ${recipient} via ${result.provider.toUpperCase()}!`
			};
		} catch (err: any) {
			return fail(500, { message: err.message || 'Failed to send test email' });
		}
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
	},

	sendInviteEmail: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const inviteId = formData.get('inviteId')?.toString();
		const recipientEmail = formData.get('recipientEmail')?.toString().trim().toLowerCase();

		if (!recipientEmail || !recipientEmail.includes('@')) {
			return fail(400, { message: 'A valid recipient email address is required' });
		}

		if (!inviteId) return fail(400, { message: 'Invite ID is required' });

		const [target] = await db.select().from(inviteCodes).where(eq(inviteCodes.id, inviteId)).limit(1);
		if (!target) {
			return fail(404, { message: 'Invite code not found' });
		}

		try {
			const result = await sendInviteEmail({
				recipient: recipientEmail,
				code: target.code,
				role: target.role,
				origin: event.url.origin,
				maxUses: target.maxUses,
				inviterName: event.locals.user.name || 'Run Administrator'
			});

			if (!result.success) {
				return fail(500, { message: result.error || 'Failed to dispatch email' });
			}

			return {
				success: true,
				message: `Invitation email sent to ${recipientEmail} via ${result.provider}`
			};
		} catch (err: any) {
			return fail(500, { message: err.message || 'Email delivery failed' });
		}
	},

	createAndEmailInvite: async (event) => {
		if (!event.locals.user?.id) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const code = formData.get('code')?.toString().trim();
		const maxUses = parseInt(formData.get('maxUses')?.toString() || '1', 10);
		const role = (formData.get('role')?.toString() as any) || 'member';
		const recipientEmail = formData.get('recipientEmail')?.toString().trim().toLowerCase();

		if (!recipientEmail || !recipientEmail.includes('@')) {
			return fail(400, { message: 'A valid recipient email address is required' });
		}

		try {
			const newInvite = await createInviteCode({
				code: code || undefined,
				maxUses: isNaN(maxUses) ? 1 : maxUses,
				role,
				creatorId: event.locals.user.id
			});

			const result = await sendInviteEmail({
				recipient: recipientEmail,
				code: newInvite.code,
				role: newInvite.role,
				origin: event.url.origin,
				maxUses: newInvite.maxUses,
				inviterName: event.locals.user.name || 'Run Administrator'
			});

			if (!result.success) {
				return {
					success: true,
					message: `Invite code ${newInvite.code} created, but email dispatch failed: ${result.error}`
				};
			}

			return {
				success: true,
				message: `VIP code ${newInvite.code} created and emailed to ${recipientEmail}`
			};
		} catch (e: any) {
			return fail(400, { message: e.message || 'Failed to create invite and email' });
		}
	}
};
