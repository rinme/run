import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { resolveShortLink } from '#lib/server/resolver.ts';

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
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
