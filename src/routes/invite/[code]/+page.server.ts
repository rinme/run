import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const code = params.code;
	throw redirect(302, `/login?code=${encodeURIComponent(code)}`);
};
