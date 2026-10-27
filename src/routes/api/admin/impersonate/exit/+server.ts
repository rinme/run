import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	event.cookies.delete('run_impersonate_target_id', { path: '/' });

	const acceptHeader = event.request.headers.get('accept') || '';
	if (acceptHeader.includes('application/json')) {
		return json({ success: true, message: 'Impersonation ended' });
	}

	throw redirect(303, '/admin/users');
};
