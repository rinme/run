import type { LayoutServerLoad } from './$types';
import { getSiteSetting, DEFAULT_GENERAL_CONFIG, type SiteGeneralConfig } from '#lib/server/settings.ts';
import { getUserWorkspaces, type UserWorkspace } from '#lib/server/workspaces.ts';

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	const generalConfig = await getSiteSetting<SiteGeneralConfig>('general', DEFAULT_GENERAL_CONFIG);

	const resolvedSiteUrl =
		generalConfig.siteUrl && generalConfig.siteUrl !== 'http://localhost:5173'
			? generalConfig.siteUrl
			: (process.env.ORIGIN || url.origin);

	const resolvedDefaultDomain =
		generalConfig.defaultDomain && generalConfig.defaultDomain !== 'go.run.link'
			? generalConfig.defaultDomain
			: url.host;

	let userWorkspaces: UserWorkspace[] = [];
	let activeWorkspace: UserWorkspace | null = null;

	if (locals.user?.id) {
		userWorkspaces = await getUserWorkspaces(locals.user.id);
		const cookieWorkspaceId = cookies.get('run_active_workspace');
		if (cookieWorkspaceId) {
			activeWorkspace = userWorkspaces.find((w) => w.id === cookieWorkspaceId) || null;
		}

		if (!activeWorkspace && userWorkspaces.length > 0) {
			// Default to personal workspace or first
			activeWorkspace = userWorkspaces.find((w) => w.isPersonal) || userWorkspaces[0];
			cookies.set('run_active_workspace', activeWorkspace.id, {
				path: '/',
				httpOnly: false,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 365
			});
		}
	}

	return {
		user: locals.user ?? null,
		session: locals.session ?? null,
		activeWorkspace,
		userWorkspaces,
		siteConfig: {
			...generalConfig,
			siteUrl: resolvedSiteUrl,
			defaultDomain: resolvedDefaultDomain
		}
	};
};
