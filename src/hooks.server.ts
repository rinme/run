import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { session as sessionTable, user as userTable } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { resolveShortLink } from '#lib/server/resolver.ts';
import { redirect } from '@sveltejs/kit';
import { UAParser } from 'ua-parser-js';
import { getClientIp, createForwardedHeaders } from '#lib/server/ip.ts';
import { runWorkspaceMigration } from '#lib/server/workspace-migration.ts';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Resolve short links at the edge before hitting app route SSR
	if (!building) {
		runWorkspaceMigration().catch(() => {});

		const resolution = await resolveShortLink(event.request, event.url);
		if (resolution.type === 'redirect' && resolution.location) {
			return Response.redirect(resolution.location, resolution.status || 302);
		}
		if (resolution.type === 'response' && resolution.response) {
			return resolution.response;
		}
	}

	// 2. Handle Better Auth session & pass to SvelteKit app routes
	const forwardedHeaders = createForwardedHeaders(event);
	const session = await auth.api.getSession({ headers: forwardedHeaders });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user as App.ExtendedUser;

		// Self-healing: if session record has empty or default IP, backfill with true client IP & UA
		const clientIp = getClientIp(event);
		const userAgent = event.request.headers.get('user-agent') || '';
		if (
			session.session.id &&
			(!session.session.ipAddress || session.session.ipAddress === '127.0.0.1' || !session.session.userAgent)
		) {
			if (clientIp && clientIp !== '127.0.0.1') {
				db.update(sessionTable)
					.set({
						ipAddress: clientIp,
						userAgent: userAgent || session.session.userAgent
					})
					.where(eq(sessionTable.id, session.session.id))
					.catch(() => {});
				session.session.ipAddress = clientIp;
				if (userAgent) session.session.userAgent = userAgent;
			}
		}
	}

	// 2.5 Impersonation (Spectator Mode for Admins)
	if (event.locals.user?.role === 'admin') {
		const impersonateTargetId = event.cookies.get('run_impersonate_target_id');
		if (impersonateTargetId && impersonateTargetId !== event.locals.user.id) {
			const targetUser = await db
				.select()
				.from(userTable)
				.where(eq(userTable.id, impersonateTargetId))
				.get();

			if (targetUser) {
				event.locals.impersonator = event.locals.user;
				event.locals.user = targetUser as App.ExtendedUser;
			} else {
				// Target no longer exists
				event.cookies.delete('run_impersonate_target_id', { path: '/' });
			}
		}
	}

	// 3. Global Auth Guard: protect all private dashboard pages from unauthenticated access
	const pathname = event.url.pathname;
	const isPublicRoute =
		pathname === '/login' ||
		pathname.startsWith('/login/') ||
		pathname === '/forgot-password' ||
		pathname.startsWith('/forgot-password/') ||
		pathname === '/reset-password' ||
		pathname.startsWith('/reset-password/') ||
		pathname.startsWith('/invite/') ||
		pathname.startsWith('/workspace/join') ||
		pathname.startsWith('/api/') ||
		pathname.startsWith('/demo/better-auth') ||
		pathname === '/favicon.ico' ||
		pathname === '/robots.txt';

	if (!event.locals.user && !isPublicRoute) {
		throw redirect(302, '/login');
	}

	// 4. Mobile Device Auto-Detection & View Mode Routing
	if (!building && event.locals.user && !isPublicRoute) {
		const viewModeCookie = event.cookies.get('run_view_mode');
		const userAgent = event.request.headers.get('user-agent') || '';
		const parser = new UAParser(userAgent);
		const deviceType = parser.getDevice().type;
		const isMobileDevice = deviceType === 'mobile' || deviceType === 'tablet';

		const prefersDesktop = viewModeCookie === 'desktop';
		const prefersMobile = viewModeCookie === 'mobile' || (!viewModeCookie && isMobileDevice);

		if (prefersDesktop && pathname.startsWith('/m')) {
			// Redirect from /m/* to desktop equivalent
			const desktopPath = pathname === '/m' ? '/' : pathname.replace(/^\/m/, '');
			throw redirect(302, desktopPath);
		} else if (prefersMobile && !pathname.startsWith('/m')) {
			// If on a page with a dedicated mobile counterpart, redirect to /m/*
			if (pathname === '/') {
				throw redirect(302, '/m');
			} else if (pathname === '/analytics') {
				throw redirect(302, '/m/analytics');
			} else if (pathname === '/qr') {
				throw redirect(302, '/m/qr');
			} else if (pathname === '/account') {
				throw redirect(302, '/m/account');
			}
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
