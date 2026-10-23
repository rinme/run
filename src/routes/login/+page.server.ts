import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { getSiteSetting, DEFAULT_AUTH_CONFIG, type SiteAuthConfig } from '#lib/server/settings.ts';
import { validateInviteCode, consumeInviteCode } from '#lib/server/invites.ts';
import { eq, count } from 'drizzle-orm';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		throw redirect(302, '/');
	}

	const [userCount] = await db.select({ total: count() }).from(user);
	const isFirstUser = (userCount?.total ?? 0) === 0;

	const authConfig = await getSiteSetting<SiteAuthConfig>('auth', DEFAULT_AUTH_CONFIG);
	const inviteCode = event.url.searchParams.get('code') || '';

	let inviteDetails = null;
	if (inviteCode) {
		const validation = await validateInviteCode(inviteCode);
		if (validation.valid && validation.invite) {
			inviteDetails = {
				code: validation.invite.code,
				role: validation.invite.role
			};
		}
	}

	return {
		isFirstUser,
		registrationMode: isFirstUser ? 'open' : authConfig.registrationMode,
		initialInviteCode: inviteCode,
		inviteDetails
	};
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required', mode: 'signin' });
		}

		try {
			await auth.api.signInEmail({
				body: { email, password, callbackURL: '/' }
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Invalid email or password', mode: 'signin' });
			}
			return fail(500, { message: 'Authentication service error', mode: 'signin' });
		}

		throw redirect(302, '/');
	},

	signUp: async (event) => {
		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const email = formData.get('email')?.toString().trim().toLowerCase() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const inviteCode = formData.get('inviteCode')?.toString().trim() ?? '';

		if (!email || !password || !name) {
			return fail(400, { message: 'Name, email, and password are required', mode: 'signup' });
		}

		const [userCount] = await db.select({ total: count() }).from(user);
		const isFirstUser = (userCount?.total ?? 0) === 0;

		const authConfig = await getSiteSetting<SiteAuthConfig>('auth', DEFAULT_AUTH_CONFIG);

		// Check registration mode gate (first user always allowed to bootstrap admin)
		if (!isFirstUser && authConfig.registrationMode === 'closed') {
			return fail(403, { message: 'Registration is currently closed by the system administrator.', mode: 'signup' });
		}

		let grantedRole: 'admin' | 'trusted' | 'member' = isFirstUser ? 'admin' : 'member';

		if (!isFirstUser && authConfig.registrationMode === 'invite_only') {
			if (!inviteCode) {
				return fail(400, {
					message: 'An invite code is required to register on this system.',
					mode: 'signup'
				});
			}

			const validation = await validateInviteCode(inviteCode);
			if (!validation.valid || !validation.invite) {
				return fail(400, {
					message: validation.reason || 'Invalid or expired invite code.',
					mode: 'signup'
				});
			}

			grantedRole = (validation.invite.role as 'admin' | 'trusted' | 'member') || 'member';
		}

		try {
			await auth.api.signUpEmail({
				body: { email, password, name, callbackURL: '/' }
			});

			if (isFirstUser) {
				grantedRole = 'admin';
			}

			// Consume invite code if one was provided
			if (inviteCode) {
				await consumeInviteCode(inviteCode);
			}

			// Persist role in user table
			await db.update(user).set({ role: grantedRole }).where(eq(user.email, email));
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Registration failed', mode: 'signup' });
			}
			return fail(500, { message: 'Registration error: ' + (error as Error).message, mode: 'signup' });
		}

		throw redirect(302, '/');
	}
};
