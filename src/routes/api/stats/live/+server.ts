import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links } from '#lib/server/db/schema.ts';
import { TINYBIRD_API_URL, TINYBIRD_TOKEN } from '$app/env/private';
import { desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	// If Tinybird is connected, query Tinybird recent clicks
	if (TINYBIRD_API_URL && TINYBIRD_TOKEN) {
		try {
			const query = `SELECT timestamp, link_id as id, slug, country, city, device_type as deviceType, browser, os, referer FROM clicks ORDER BY timestamp DESC LIMIT 20`;
			const res = await fetch(
				`${TINYBIRD_API_URL}/v0/sql?q=${encodeURIComponent(query)}`,
				{
					headers: { Authorization: `Bearer ${TINYBIRD_TOKEN}` }
				}
			);
			if (res.ok) {
				const body = (await res.json()) as { data: unknown[] };
				return json({ events: body.data || [] });
			}
		} catch (e) {
			console.warn('Tinybird live fetch failed, fallback to local:', e);
		}
	}

	// Local development fallback: generate synthetic live events from active links
	const activeLinks = await db
		.select({
			id: links.id,
			slug: links.slug,
			currentClicks: links.currentClicks
		})
		.from(links)
		.orderBy(desc(links.updatedAt))
		.limit(5);

	const countries = ['US', 'DE', 'GB', 'FR', 'JP', 'CA', 'SG', 'BR'];
	const cities: Record<string, string> = {
		US: 'New York',
		DE: 'Berlin',
		GB: 'London',
		FR: 'Paris',
		JP: 'Tokyo',
		CA: 'Toronto',
		SG: 'Singapore',
		BR: 'São Paulo'
	};
	const devices = ['desktop', 'mobile', 'tablet'];
	const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];

	const syntheticEvents = activeLinks.map((l, index) => {
		const c = countries[Math.floor(Math.random() * countries.length)];
		return {
			id: `synthetic-${l.id}-${Date.now()}-${index}`,
			timestamp: new Date(Date.now() - index * 2000).toISOString(),
			slug: l.slug,
			country: c,
			city: cities[c] || 'Unknown',
			deviceType: devices[Math.floor(Math.random() * devices.length)],
			browser: browsers[Math.floor(Math.random() * browsers.length)],
			os: 'macOS',
			referer: 'https://twitter.com'
		};
	});

	return json({ events: syntheticEvents });
};
