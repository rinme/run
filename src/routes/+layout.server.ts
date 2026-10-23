import type { LayoutServerLoad } from './$types';
import { getSiteSetting, DEFAULT_GENERAL_CONFIG, type SiteGeneralConfig } from '#lib/server/settings.ts';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const generalConfig = await getSiteSetting<SiteGeneralConfig>('general', DEFAULT_GENERAL_CONFIG);

	const resolvedSiteUrl =
		generalConfig.siteUrl && generalConfig.siteUrl !== 'http://localhost:5173'
			? generalConfig.siteUrl
			: (process.env.ORIGIN || url.origin);

	const resolvedDefaultDomain =
		generalConfig.defaultDomain && generalConfig.defaultDomain !== 'go.run.link'
			? generalConfig.defaultDomain
			: url.host;

	return {
		user: locals.user ?? null,
		session: locals.session ?? null,
		siteConfig: {
			...generalConfig,
			siteUrl: resolvedSiteUrl,
			defaultDomain: resolvedDefaultDomain
		}
	};
};
