import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { createForwardedHeaders } from '#lib/server/ip.ts';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase() || '';

		if (!email || !email.includes('@')) {
			return fail(400, { message: 'A valid email address is required.' });
		}

		const headers = createForwardedHeaders(event);

		try {
			await auth.api.requestPasswordReset({
				body: {
					email,
					redirectTo: `${event.url.origin}/reset-password`
				},
				headers
			});
		} catch (err: any) {
			console.error('[ForgetPassword Error]:', err);
			// Do not leak email presence to prevent account enumeration attacks
		}

		return {
			success: true,
			message: `If an account is associated with ${email}, a password reset link has been dispatched to your inbox.`
		};
	}
};
