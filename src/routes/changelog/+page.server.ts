import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const res = await fetch('/api/changelog');
		if (res.ok) {
			const data = await res.json();
			return {
				repo: data.repo || 'rinme/run',
				releases: data.releases || [],
				fallback: Boolean(data.fallback)
			};
		}
	} catch (e) {
		console.warn('Changelog load error:', e);
	}

	return {
		repo: 'rinme/run',
		releases: [],
		fallback: true
	};
};
