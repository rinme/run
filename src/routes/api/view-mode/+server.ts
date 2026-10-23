import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const mode = url.searchParams.get('mode');
	let redirectPath = url.searchParams.get('redirect') || '';

	// Ensure safe relative redirect path
	if (!redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
		redirectPath = mode === 'desktop' ? '/' : '/m';
	}

	if (mode === 'desktop' || mode === 'mobile') {
		cookies.set('run_view_mode', mode, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365, // 1 year
			httpOnly: false,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production'
		});
	}

	return new Response(null, {
		status: 302,
		headers: {
			Location: redirectPath
		}
	});
};
