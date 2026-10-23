import { db } from '#lib/server/db/index.ts';
import { webhooks } from '#lib/server/db/schema.ts';
import { eq, and } from 'drizzle-orm';

export interface WebhookPayloadData {
	slug?: string;
	destinationUrl?: string;
	country?: string;
	city?: string;
	deviceType?: string;
	browser?: string;
	os?: string;
	referer?: string;
	deliveryMode?: string;
	reason?: string;
	ip?: string;
	[key: string]: unknown;
}

export type WebhookEventType = 'link.created' | 'link.clicked' | 'security.blocked' | 'test.ping';

/**
 * Checks if a given URL is a Discord Incoming Webhook
 */
export function isDiscordWebhookUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return (
			(parsed.hostname === 'discord.com' || parsed.hostname === 'discordapp.com') &&
			parsed.pathname.startsWith('/api/webhooks/')
		);
	} catch {
		return false;
	}
}

/**
 * Generates an HMAC-SHA256 signature for outgoing webhook payload
 */
async function generateHmacSignature(payload: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secret);
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Transforms an internal event into a Discord Webhook rich embed payload
 */
export function formatDiscordPayload(
	event: WebhookEventType,
	data: WebhookPayloadData,
	discordConfig?: { username?: string; avatarUrl?: string; embedColor?: number } | null
) {
	const defaultColor =
		event === 'security.blocked'
			? 0xef4444 // Red
			: event === 'link.created'
				? 0x3b82f6 // Blue
				: 0x10b981; // Emerald

	const color = discordConfig?.embedColor || defaultColor;

	const titleMap: Record<WebhookEventType, string> = {
		'link.created': `⚡ New Link Created: /${data.slug || ''}`,
		'link.clicked': `🔗 Link Navigated: /${data.slug || ''}`,
		'security.blocked': `🛡️ Security Gate Alert: /${data.slug || ''}`,
		'test.ping': '🧪 Webhook Integration Test'
	};

	const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

	if (data.slug) {
		fields.push({ name: 'Slug', value: `\`/${data.slug}\``, inline: true });
	}

	if (data.deliveryMode) {
		fields.push({ name: 'Delivery Mode', value: `\`${data.deliveryMode}\``, inline: true });
	}

	if (data.destinationUrl) {
		fields.push({
			name: 'Destination URL',
			value: data.destinationUrl.length > 80 ? data.destinationUrl.substring(0, 77) + '...' : data.destinationUrl,
			inline: false
		});
	}

	if (data.country || data.city) {
		const loc = [data.city, data.country].filter(Boolean).join(', ');
		fields.push({ name: 'Location', value: loc || 'Unknown', inline: true });
	}

	if (data.deviceType || data.os || data.browser) {
		const dev = [data.deviceType, data.os, data.browser].filter(Boolean).join(' • ');
		fields.push({ name: 'Client', value: dev || 'Unknown', inline: true });
	}

	if (data.referer) {
		fields.push({ name: 'Referer', value: data.referer || 'Direct', inline: true });
	}

	if (data.reason) {
		fields.push({ name: 'Reason', value: data.reason, inline: false });
	}

	return {
		username: discordConfig?.username || 'Run Webhook Engine',
		avatar_url: discordConfig?.avatarUrl || 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.png',
		embeds: [
			{
				title: titleMap[event] || `Event: ${event}`,
				description:
					event === 'test.ping'
						? 'Your webhook endpoint has been successfully verified by Run.'
						: undefined,
				color,
				fields,
				timestamp: new Date().toISOString(),
				footer: {
					text: 'Run Link Engine'
				}
			}
		]
	};
}

/**
 * Dispatches an event to all registered and active webhooks for a given workspace
 */
export async function dispatchWebhookEvent(
	workspaceId: string,
	event: WebhookEventType,
	data: WebhookPayloadData
): Promise<void> {
	try {
		const hooks = await db
			.select()
			.from(webhooks)
			.where(and(eq(webhooks.workspaceId, workspaceId), eq(webhooks.isActive, true)));

		if (!hooks || hooks.length === 0) return;

		for (const hook of hooks) {
			// Check if webhook is subscribed to this event
			let subscribedEvents: string[] = [];
			try {
				subscribedEvents = JSON.parse(hook.events);
			} catch {
				subscribedEvents = ['*'];
			}

			if (!subscribedEvents.includes('*') && !subscribedEvents.includes(event)) {
				continue;
			}

			// Parse discord config if present
			let discordConfig: { username?: string; avatarUrl?: string; embedColor?: number } | null = null;
			if (hook.discordConfig) {
				try {
					discordConfig = JSON.parse(hook.discordConfig);
				} catch {
					// fallback null
				}
			}

			// Fire and forget, or handle async delivery
			deliverWebhook(hook, event, data, discordConfig).catch((err) => {
				console.warn(`[Webhook Delivery Failed] ${hook.id} (${hook.name}):`, err);
			});
		}
	} catch (err) {
		console.warn('[dispatchWebhookEvent Error]:', err);
	}
}

/**
 * Performs actual HTTP delivery to a single webhook endpoint
 */
export async function deliverWebhook(
	hook: typeof webhooks.$inferSelect,
	event: WebhookEventType,
	data: WebhookPayloadData,
	discordConfig?: { username?: string; avatarUrl?: string; embedColor?: number } | null
): Promise<{ success: boolean; status?: number; error?: string }> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 6000);

	try {
		let bodyContent: string;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'User-Agent': 'Run-Webhook-Engine/1.0'
		};

		if (hook.isDiscord || isDiscordWebhookUrl(hook.url)) {
			const discordBody = formatDiscordPayload(event, data, discordConfig);
			bodyContent = JSON.stringify(discordBody);
		} else {
			const standardBody = {
				id: `evt_${crypto.randomUUID()}`,
				event,
				timestamp: new Date().toISOString(),
				data
			};
			bodyContent = JSON.stringify(standardBody);

			if (hook.secret) {
				const signature = await generateHmacSignature(bodyContent, hook.secret);
				headers['X-Run-Signature'] = signature;
			}
		}

		const res = await fetch(hook.url, {
			method: 'POST',
			headers,
			body: bodyContent,
			signal: controller.signal
		});

		clearTimeout(timeout);

		const success = res.ok;
		await db
			.update(webhooks)
			.set({
				lastTriggeredAt: new Date(),
				failureCount: success ? 0 : hook.failureCount + 1
			})
			.where(eq(webhooks.id, hook.id));

		return { success, status: res.status };
	} catch (err) {
		clearTimeout(timeout);
		await db
			.update(webhooks)
			.set({
				failureCount: hook.failureCount + 1
			})
			.where(eq(webhooks.id, hook.id));

		return { success: false, error: (err as Error).message };
	}
}
