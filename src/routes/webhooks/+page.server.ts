import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { webhooks, user, organization } from '#lib/server/db/schema.ts';
import { isDiscordWebhookUrl, deliverWebhook } from '#lib/server/webhooks.ts';
import { getOrCreateDefaultWorkspace } from '#lib/server/api-auth.ts';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	const currentUser = await db
		.select()
		.from(user)
		.where(eq(user.id, event.locals.user.id))
		.get();

	if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'trusted')) {
		return {
			authorized: false,
			webhooks: []
		};
	}

	const workspaceId = await getOrCreateDefaultWorkspace(event.locals.user.id);

	const list = await db
		.select()
		.from(webhooks)
		.where(eq(webhooks.workspaceId, workspaceId))
		.orderBy(desc(webhooks.createdAt));

	return {
		authorized: true,
		webhooks: list
	};
};

export const actions: Actions = {
	create: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const currentUser = await db
			.select()
			.from(user)
			.where(eq(user.id, event.locals.user.id))
			.get();

		if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'trusted')) {
			return fail(403, { message: 'Webhooks require Trusted or Admin privileges.' });
		}

		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim();
		const url = formData.get('url')?.toString().trim();
		const secret = formData.get('secret')?.toString().trim() || null;

		// Events selection
		const events: string[] = [];
		if (formData.get('evt_created') === 'true') events.push('link.created');
		if (formData.get('evt_clicked') === 'true') events.push('link.clicked');
		if (formData.get('evt_security') === 'true') events.push('security.blocked');

		if (!name || !url) {
			return fail(400, { message: 'Name and Destination URL are required.' });
		}

		try {
			new URL(url);
		} catch {
			return fail(400, { message: 'Invalid URL format.' });
		}

		const isDiscord = isDiscordWebhookUrl(url) || formData.get('forceDiscord') === 'true';

		let discordConfig: string | null = null;
		if (isDiscord) {
			const username = formData.get('discordUsername')?.toString().trim() || 'Run Link Engine';
			const avatarUrl = formData.get('discordAvatarUrl')?.toString().trim() || '';
			const embedColorHex = formData.get('discordColor')?.toString().replace('#', '') || '10b981';
			const embedColor = parseInt(embedColorHex, 16) || 0x10b981;

			discordConfig = JSON.stringify({
				username,
				avatarUrl: avatarUrl || undefined,
				embedColor
			});
		}

		const workspaceId = await getOrCreateDefaultWorkspace(event.locals.user.id);

		await db.insert(webhooks).values({
			workspaceId,
			name,
			url,
			secret,
			events: JSON.stringify(events.length > 0 ? events : ['link.clicked']),
			isActive: true,
			isDiscord,
			discordConfig
		});

		return { success: true, message: 'Webhook endpoint registered successfully' };
	},

	test: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const webhookId = formData.get('webhookId')?.toString();

		if (!webhookId) return fail(400, { message: 'Webhook ID required' });

		const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
		if (!hook) return fail(404, { message: 'Webhook not found' });

		let discordConfig: any = null;
		if (hook.discordConfig) {
			try {
				discordConfig = JSON.parse(hook.discordConfig);
			} catch {}
		}

		const result = await deliverWebhook(
			hook,
			'test.ping',
			{
				slug: 'run-test',
				destinationUrl: 'https://run.link/demo',
				country: 'US',
				city: 'San Francisco',
				deviceType: 'Desktop',
				browser: 'Chrome 131',
				os: 'macOS',
				deliveryMode: 'direct',
				reason: 'Manual ping test triggered from Run console'
			},
			discordConfig
		);

		if (result.success) {
			return { success: true, message: `Test ping dispatched successfully! HTTP ${result.status || 200}` };
		} else {
			return fail(400, { message: `Test ping failed: ${result.error || `HTTP ${result.status}`}` });
		}
	},

	toggle: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const webhookId = formData.get('webhookId')?.toString();

		if (!webhookId) return fail(400, { message: 'Webhook ID required' });

		const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
		if (hook) {
			await db.update(webhooks).set({ isActive: !hook.isActive }).where(eq(webhooks.id, webhookId));
		}

		return { success: true, message: 'Webhook state updated' };
	},

	delete: async (event) => {
		if (!event.locals.user) throw redirect(302, '/login');

		const formData = await event.request.formData();
		const webhookId = formData.get('webhookId')?.toString();

		if (!webhookId) return fail(400, { message: 'Webhook ID required' });

		await db.delete(webhooks).where(eq(webhooks.id, webhookId));
		return { success: true, message: 'Webhook removed' };
	}
};
