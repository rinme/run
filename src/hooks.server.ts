import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { resolveShortLink } from '#lib/server/resolver.ts';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Resolve short links at the edge before hitting app route SSR
	if (!building) {
		const resolution = await resolveShortLink(event.request, event.url);
		if (resolution.type === 'redirect' && resolution.location) {
			return Response.redirect(resolution.location, resolution.status || 302);
		}
		if (resolution.type === 'response' && resolution.response) {
			return resolution.response;
		}
	}

	// 2. Handle Better Auth session & pass to SvelteKit app routes
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user as App.ExtendedUser;
	}

	// 3. Global Auth Guard: protect all private dashboard pages from unauthenticated access
	const pathname = event.url.pathname;
	const isPublicRoute =
		pathname === '/login' ||
		pathname.startsWith('/login/') ||
		pathname.startsWith('/invite/') ||
		pathname.startsWith('/api/') ||
		pathname.startsWith('/demo/better-auth') ||
		pathname === '/favicon.ico' ||
		pathname === '/robots.txt';

	if (!event.locals.user && !isPublicRoute) {
		throw redirect(302, '/login');
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
