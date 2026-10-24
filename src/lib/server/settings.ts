import { db } from '#lib/server/db/index.ts';
import { siteSettings } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';

export interface SiteGeneralConfig {
	siteTitle: string;
	siteTagline: string;
	siteUrl: string;
	defaultDomain: string;
	defaultDeliveryMode: string;
}

export interface SiteAuthConfig {
	registrationMode: 'invite_only' | 'public' | 'closed';
	requireEmailVerification: boolean;
	allowUserInviteCreation: boolean;
}

export interface SiteEmailConfig {
	provider: 'console' | 'smtp' | 'resend';
	smtpHost: string;
	smtpPort: number;
	smtpUser: string;
	smtpPass: string;
	fromEmail: string;
	fromName: string;
	resendApiKey: string;
}

export interface SiteFeaturesConfig {
	enableWebhooks: boolean;
	enableAiSuggestions: boolean;
	enablePublicStats: boolean;
	enableMcpServer: boolean;
	enable3dGlobe: boolean;
	changelogRepo: string;
}

export const DEFAULT_GENERAL_CONFIG: SiteGeneralConfig = {
	siteTitle: 'Run',
	siteTagline: 'Link Management & Analytics',
	siteUrl: process.env.ORIGIN || 'http://localhost:5173',
	defaultDomain: process.env.ORIGIN
		? (() => {
				try {
					return new URL(process.env.ORIGIN).host;
				} catch {
					return 'go.run.link';
				}
			})()
		: 'go.run.link',
	defaultDeliveryMode: 'direct'
};

export const DEFAULT_AUTH_CONFIG: SiteAuthConfig = {
	registrationMode: 'invite_only',
	requireEmailVerification: false,
	allowUserInviteCreation: true
};

export const DEFAULT_EMAIL_CONFIG: SiteEmailConfig = {
	provider: 'console',
	smtpHost: 'smtp.sendgrid.net',
	smtpPort: 587,
	smtpUser: '',
	smtpPass: '',
	fromEmail: 'noreply@run.link',
	fromName: 'Run Links Engine',
	resendApiKey: ''
};

export const DEFAULT_FEATURES_CONFIG: SiteFeaturesConfig = {
	enableWebhooks: true,
	enableAiSuggestions: true,
	enablePublicStats: true,
	enableMcpServer: true,
	enable3dGlobe: true,
	changelogRepo: 'rinme/run'
};

export async function getSiteSetting<T>(key: string, defaultValue: T): Promise<T> {
	try {
		const row = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).get();
		if (!row) return defaultValue;
		return JSON.parse(row.value) as T;
	} catch {
		return defaultValue;
	}
}

export async function setSiteSetting<T>(key: string, value: T): Promise<void> {
	const jsonVal = JSON.stringify(value);
	const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).get();

	if (existing) {
		await db
			.update(siteSettings)
			.set({ value: jsonVal, updatedAt: new Date() })
			.where(eq(siteSettings.key, key));
	} else {
		await db.insert(siteSettings).values({
			key,
			value: jsonVal,
			updatedAt: new Date()
		});
	}
}

export async function getAllSiteSettings() {
	const [general, auth, email, features] = await Promise.all([
		getSiteSetting<SiteGeneralConfig>('general', DEFAULT_GENERAL_CONFIG),
		getSiteSetting<SiteAuthConfig>('auth', DEFAULT_AUTH_CONFIG),
		getSiteSetting<SiteEmailConfig>('email', DEFAULT_EMAIL_CONFIG),
		getSiteSetting<SiteFeaturesConfig>('features', DEFAULT_FEATURES_CONFIG)
	]);

	return {
		general,
		auth,
		email,
		features
	};
}
