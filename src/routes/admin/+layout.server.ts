import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	const operator = event.locals.impersonator || event.locals.user;
	if (!operator) {
		throw redirect(302, '/login');
	}

	const [currentUser] = await db
		.select()
		.from(user)
		.where(eq(user.id, operator.id))
		.limit(1);

	if (!currentUser || currentUser.role !== 'admin') {
		throw redirect(302, '/');
	}

	return {
		adminUser: currentUser,
		isImpersonating: Boolean(event.locals.impersonator)
	};
};
