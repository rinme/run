import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links, domains, type NewLink } from '#lib/server/db/schema.ts';
import { linkCache } from '#lib/server/cache.ts';
import { hashPassword } from '#lib/server/security.ts';
import { eq, desc, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	const workspaceId = url.searchParams.get('workspaceId');

	const query = db
		.select()
		.from(links)
		.where(eq(links.isArchived, false))
		.orderBy(desc(links.createdAt))
		.limit(50);

	const allLinks = await query;
	return json(allLinks);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const data = await request.json();

	if (!data.destinationUrl) {
		return json({ error: 'Destination URL is required' }, { status: 400 });
	}

	// Default slug if not provided
	let slug = (data.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
	if (!slug) {
		slug = Math.random().toString(36).substring(2, 8);
	}

	// Check slug collision
	const existing = await db
		.select({ id: links.id })
		.from(links)
		.where(eq(links.slug, slug))
		.limit(1);

	if (existing.length > 0) {
		return json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
	}

	// Hash password if password mode
	let passwordHash: string | undefined = undefined;
	if (data.deliveryMode === 'password' && data.password) {
		passwordHash = await hashPassword(data.password);
	}

	// Fallback workspace id if no org session yet
	let workspaceId = data.workspaceId || (locals.session as { activeOrganizationId?: string } | undefined)?.activeOrganizationId;
	if (!workspaceId) {
		// Use or create a default workspace
		const org = await db.query?.organization?.findFirst?.();
		workspaceId = org?.id || 'default-workspace';
	}

	const newLink: NewLink = {
		workspaceId,
		slug,
		destinationUrl: data.destinationUrl,
		title: data.title || null,
		description: data.description || null,
		image: data.image || null,
		deliveryMode: data.deliveryMode || 'direct',
		passwordHash: passwordHash || null,
		interstitialDuration: data.interstitialDuration ? Number(data.interstitialDuration) : 5,
		expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
		maxClicks: data.maxClicks ? Number(data.maxClicks) : null,
		expiredRedirectUrl: data.expiredRedirectUrl || null,
		redirectWithQuery: data.redirectWithQuery !== false,
		deviceRouting: data.deviceRouting ? JSON.stringify(data.deviceRouting) : null,
		geoRouting: data.geoRouting ? JSON.stringify(data.geoRouting) : null,
		abSplits: data.abSplits ? JSON.stringify(data.abSplits) : null,
		utmPreset: data.utmPreset ? JSON.stringify(data.utmPreset) : null,
		tags: data.tags ? JSON.stringify(data.tags) : null
	};

	const [created] = await db.insert(links).values(newLink).returning();

	// Invalidate cache
	await linkCache.invalidate(null, slug);

	return json(created, { status: 201 });
};
