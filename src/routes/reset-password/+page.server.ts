import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { createForwardedHeaders } from '#lib/server/ip.ts';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		throw redirect(302, '/');
	}

	const token = event.url.searchParams.get('token') || '';
	const error = event.url.searchParams.get('error') || '';

	return {
		token,
		urlError: error
	};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const token = formData.get('token')?.toString() || '';
		const password = formData.get('password')?.toString() || '';
		const confirmPassword = formData.get('confirmPassword')?.toString() || '';

		if (!token) {
			return fail(400, { message: 'Missing password reset token. Please request a new reset link.' });
		}

		if (!password || !confirmPassword) {
			return fail(400, { message: 'Both password fields are required.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		if (password.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters long.' });
		}

		const headers = createForwardedHeaders(event);

		try {
			await auth.api.resetPassword({
				body: {
					newPassword: password,
					token
				},
				headers
			});

			return {
				success: true,
				message: 'Your password has been successfully reset! You can now sign in.'
			};
		} catch (err: any) {
			if (err instanceof APIError) {
				return fail(400, { message: err.message || 'Invalid or expired password reset link.' });
			}
			return fail(400, { message: err.message || 'Password reset failed. The link may have expired.' });
		}
	}
};
