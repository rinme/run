import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { getSiteSetting, DEFAULT_AUTH_CONFIG, type SiteAuthConfig } from '#lib/server/settings.ts';
import { validateInviteCode, consumeInviteCode } from '#lib/server/invites.ts';
import { getOrCreateDefaultWorkspace } from '#lib/server/api-auth.ts';
import { createForwardedHeaders } from '#lib/server/ip.ts';
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

		const headers = createForwardedHeaders(event);

		try {
			await auth.api.signInEmail({
				body: { email, password, callbackURL: '/' },
				headers
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
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';
		const inviteCode = formData.get('inviteCode')?.toString().trim() ?? '';

		if (!email || !password || !name) {
			return fail(400, { message: 'Name, email, and password are required', mode: 'signup' });
		}

		if (!confirmPassword) {
			return fail(400, { message: 'Please confirm your password', mode: 'signup' });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match', mode: 'signup' });
		}

		if (password.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters long', mode: 'signup' });
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

		const headers = createForwardedHeaders(event);

		try {
			await auth.api.signUpEmail({
				body: { email, password, name, callbackURL: '/' },
				headers
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

			// Ensure default organization workspace exists and user is linked
			const [createdUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
			if (createdUser?.id) {
				await getOrCreateDefaultWorkspace(createdUser.id);
			}
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Registration failed', mode: 'signup' });
			}
			return fail(500, { message: 'Registration error: ' + (error as Error).message, mode: 'signup' });
		}

		throw redirect(302, '/');
	}
};
