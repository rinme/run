import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getAllSiteSettings,
	setSiteSetting,
	type SiteGeneralConfig,
	type SiteAuthConfig,
	type SiteEmailConfig,
	type SiteFeaturesConfig
} from '#lib/server/settings.ts';
import { sendTestEmail } from '#lib/server/email.ts';

export const load: PageServerLoad = async (event) => {
	const operator = event.locals.impersonator || event.locals.user;
	if (!operator || operator.role !== 'admin') throw redirect(302, '/');

	const settings = await getAllSiteSettings();
	if (settings.general.siteUrl === 'http://localhost:5173') {
		settings.general.siteUrl = process.env.ORIGIN || event.url.origin;
	}
	if (settings.general.defaultDomain === 'go.run.link') {
		settings.general.defaultDomain = event.url.host;
	}

	return {
		settings,
		user: operator
	};
};

export const actions: Actions = {
	updateGeneral: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

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
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

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
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

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
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const recipient =
			formData.get('testRecipient')?.toString().trim() ||
			operator.email ||
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
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

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
	}
};
