import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import {
	user,
	session,
	links,
	domains,
	utmTemplates,
	inviteCodes,
	siteSettings,
	webhooks
} from '#lib/server/db/schema.ts';
import { count, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const operator = event.locals.impersonator || event.locals.user;
	if (!operator || operator.role !== 'admin') throw redirect(302, '/');

	const [userCount] = await db.select({ total: count() }).from(user);
	const [linkCount] = await db.select({ total: count() }).from(links);
	const [sessionCount] = await db.select({ total: count() }).from(session);
	const [inviteCount] = await db.select({ total: count() }).from(inviteCodes);
	const [webhookCount] = await db.select({ total: count() }).from(webhooks);
	const [domainCount] = await db.select({ total: count() }).from(domains);
	const [utmCount] = await db.select({ total: count() }).from(utmTemplates);
	const [settingsCount] = await db.select({ total: count() }).from(siteSettings);

	// Recent users
	const recentUsers = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			createdAt: user.createdAt
		})
		.from(user)
		.orderBy(desc(user.createdAt))
		.limit(6);

	return {
		stats: {
			users: userCount.total,
			links: linkCount.total,
			sessions: sessionCount.total,
			invites: inviteCount.total,
			webhooks: webhookCount.total,
			domains: domainCount.total,
			utmTemplates: utmCount.total,
			siteSettings: settingsCount.total
		},
		recentUsers,
		user: operator
	};
};
