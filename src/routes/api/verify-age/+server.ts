import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAgeToken } from '#lib/server/security.ts';

export const GET: RequestHandler = async ({ url }) => {
	const slug = url.searchParams.get('slug');
	if (!slug) {
		return json({ error: 'Missing slug parameter' }, { status: 400 });
	}

	const token = await generateAgeToken(slug);
	return json({ token });
};
