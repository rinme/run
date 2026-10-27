import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import {
	links,
	domains,
	utmTemplates,
	inviteCodes,
	siteSettings,
	webhooks
} from '#lib/server/db/schema.ts';
import { DATASET_METADATA } from '#lib/server/backup-service.ts';
import { count } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const operator = event.locals.impersonator || event.locals.user;
	if (!operator || operator.role !== 'admin') throw redirect(302, '/');

	const [linkCount] = await db.select({ total: count() }).from(links);
	const [webhookCount] = await db.select({ total: count() }).from(webhooks);
	const [domainCount] = await db.select({ total: count() }).from(domains);
	const [utmCount] = await db.select({ total: count() }).from(utmTemplates);
	const [settingsCount] = await db.select({ total: count() }).from(siteSettings);
	const [inviteCount] = await db.select({ total: count() }).from(inviteCodes);

	return {
		backupStats: {
			links: linkCount.total,
			domains: domainCount.total,
			utmTemplates: utmCount.total,
			webhooks: webhookCount.total,
			siteSettings: settingsCount.total,
			inviteCodes: inviteCount.total
		},
		datasetMetadata: DATASET_METADATA
	};
};
