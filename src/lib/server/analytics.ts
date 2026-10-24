import { UAParser } from 'ua-parser-js';
import { db } from './db';
import { links } from './db/schema';
import { eq, sql } from 'drizzle-orm';

let tinybirdApiUrl = (process.env.TINYBIRD_API_URL || process.env.TINYBIRD_URL || '').replace(/\/+$/, '');
let tinybirdToken = (process.env.TINYBIRD_TOKEN || '').trim();

try {
	const privateEnv = (await import('$app/env/private')) as unknown as Record<string, string | undefined>;
	if (privateEnv.TINYBIRD_API_URL || privateEnv.TINYBIRD_URL) {
		tinybirdApiUrl = (privateEnv.TINYBIRD_API_URL || privateEnv.TINYBIRD_URL || '').replace(/\/+$/, '');
	}
	if (privateEnv.TINYBIRD_TOKEN) tinybirdToken = privateEnv.TINYBIRD_TOKEN.trim();
} catch {}

export interface ClickEvent {
	timestamp: string;
	linkId: string;
	slug: string;
	destinationUrl: string;
	workspaceId: string;
	domain: string;
	country: string;
	city: string;
	deviceType: string;
	browser: string;
	os: string;
	referer: string;
	ip: string;
}

export function parseClientMetadata(request: Request): {
	deviceType: string;
	browser: string;
	os: string;
	country: string;
	city: string;
	referer: string;
	ip: string;
} {
	const userAgent = request.headers.get('user-agent') || '';
	const parser = new UAParser(userAgent);
	const device = parser.getDevice();
	const browser = parser.getBrowser();
	const os = parser.getOS();

	const country =
		request.headers.get('x-vercel-ip-country') ||
		request.headers.get('cf-ipcountry') ||
		'XX';

	const city =
		request.headers.get('x-vercel-ip-city') ||
		request.headers.get('cf-ipcity') ||
		'Unknown';

	const referer = request.headers.get('referer') || '';
	const ip =
		request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
		request.headers.get('x-real-ip') ||
		'127.0.0.1';

	return {
		deviceType: device.type || 'desktop',
		browser: browser.name || 'Unknown',
		os: os.name || 'Unknown',
		country: country.toUpperCase(),
		city,
		referer,
		ip
	};
}

export async function trackClickEvent(event: ClickEvent): Promise<void> {
	// 1. Asynchronously increment link currentClicks count in Turso DB
	try {
		await db
			.update(links)
			.set({ currentClicks: sql`${links.currentClicks} + 1` })
			.where(eq(links.id, event.linkId));
	} catch (e) {
		console.error('Error incrementing click count in DB:', e);
	}

	// 2. Stream to Tinybird if configured
	if (tinybirdApiUrl && tinybirdToken) {
		try {
			const payload = {
				timestamp: event.timestamp,
				link_id: event.linkId,
				slug: event.slug,
				destination_url: event.destinationUrl,
				workspace_id: event.workspaceId,
				domain: event.domain,
				country: event.country,
				city: event.city,
				device_type: event.deviceType,
				browser: event.browser,
				os: event.os,
				referer: event.referer,
				ip: event.ip
			};

			const response = await fetch(`${tinybirdApiUrl}/v0/events?name=clicks`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${tinybirdToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				console.warn('Tinybird ingest returned status:', response.status);
			}
		} catch (e) {
			console.error('Tinybird ingest error:', e);
		}
	}
}
