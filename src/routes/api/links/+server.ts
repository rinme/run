import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links, type NewLink } from '#lib/server/db/schema.ts';
import { linkCache } from '#lib/server/cache.ts';
import { hashPassword } from '#lib/server/security.ts';
import { dispatchWebhookEvent } from '#lib/server/webhooks.ts';
import { authenticateApiRequest, getOrCreateDefaultWorkspace } from '#lib/server/api-auth.ts';
import { RESERVED_PATHS } from '#lib/server/resolver.ts';
import { eq, desc, and, ne } from 'drizzle-orm';

export const GET: RequestHandler = async ({ request, locals, cookies }) => {
	const auth = await authenticateApiRequest(request, locals, cookies);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const allLinks = await db
		.select()
		.from(links)
		.where(and(eq(links.isArchived, false), eq(links.workspaceId, auth.workspaceId)))
		.orderBy(desc(links.createdAt))
		.limit(100);

	return json(allLinks);
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const auth = await authenticateApiRequest(request, locals, cookies);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();

	if (!data.destinationUrl) {
		return json({ error: 'Destination URL is required' }, { status: 400 });
	}

	let slug = (data.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
	if (!slug) {
		slug = Math.random().toString(36).substring(2, 8);
	}

	if (RESERVED_PATHS.has(slug)) {
		return json({ error: `Slug "${slug}" is a reserved system path and cannot be short-linked.` }, { status: 400 });
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

	let passwordHash: string | null = null;
	if (data.deliveryMode === 'password' && data.password) {
		passwordHash = await hashPassword(data.password);
	}

	const workspaceId = auth.workspaceId;

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
		tags: data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null
	};

	const [created] = await db.insert(links).values(newLink).returning();
	await linkCache.invalidate(null, slug);

	dispatchWebhookEvent(workspaceId, 'link.created', {
		slug: created.slug,
		destinationUrl: created.destinationUrl,
		deliveryMode: created.deliveryMode
	}).catch(() => {});

	return json(created, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request, locals, cookies }) => {
	const auth = await authenticateApiRequest(request, locals, cookies);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();
	const id = data.id;

	if (!id) {
		return json({ error: 'Link ID is required for updating' }, { status: 400 });
	}

	const [currentLink] = await db
		.select()
		.from(links)
		.where(and(eq(links.id, id), eq(links.workspaceId, auth.workspaceId)))
		.limit(1);
	if (!currentLink) {
		return json({ error: 'Link not found' }, { status: 404 });
	}

	let newSlug = currentLink.slug;
	if (data.slug && data.slug.trim().toLowerCase() !== currentLink.slug) {
		newSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

		if (RESERVED_PATHS.has(newSlug)) {
			return json({ error: `Slug "${newSlug}" is a reserved system path and cannot be short-linked.` }, { status: 400 });
		}

		// check collision
		const collision = await db
			.select({ id: links.id })
			.from(links)
			.where(and(eq(links.slug, newSlug), ne(links.id, id)))
			.limit(1);

		if (collision.length > 0) {
			return json({ error: `Slug "${newSlug}" is already taken.` }, { status: 409 });
		}
	}

	let passwordHash = currentLink.passwordHash;
	if (data.deliveryMode === 'password') {
		if (data.password) {
			passwordHash = await hashPassword(data.password);
		}
	} else {
		passwordHash = null;
	}

	const updatePayload: Partial<NewLink> = {
		slug: newSlug,
		destinationUrl: data.destinationUrl || currentLink.destinationUrl,
		title: data.title !== undefined ? data.title : currentLink.title,
		description: data.description !== undefined ? data.description : currentLink.description,
		image: data.image !== undefined ? data.image : currentLink.image,
		deliveryMode: data.deliveryMode || currentLink.deliveryMode,
		passwordHash,
		interstitialDuration: data.interstitialDuration !== undefined ? Number(data.interstitialDuration) : currentLink.interstitialDuration,
		expiresAt: data.expiresAt ? new Date(data.expiresAt) : data.expiresAt === null ? null : currentLink.expiresAt,
		maxClicks: data.maxClicks !== undefined ? (data.maxClicks ? Number(data.maxClicks) : null) : currentLink.maxClicks,
		expiredRedirectUrl: data.expiredRedirectUrl !== undefined ? data.expiredRedirectUrl : currentLink.expiredRedirectUrl,
		redirectWithQuery: data.redirectWithQuery !== undefined ? Boolean(data.redirectWithQuery) : currentLink.redirectWithQuery,
		deviceRouting: data.deviceRouting !== undefined ? (data.deviceRouting ? JSON.stringify(data.deviceRouting) : null) : currentLink.deviceRouting,
		geoRouting: data.geoRouting !== undefined ? (data.geoRouting ? JSON.stringify(data.geoRouting) : null) : currentLink.geoRouting,
		abSplits: data.abSplits !== undefined ? (data.abSplits ? JSON.stringify(data.abSplits) : null) : currentLink.abSplits,
		utmPreset: data.utmPreset !== undefined ? (data.utmPreset ? JSON.stringify(data.utmPreset) : null) : currentLink.utmPreset,
		tags: data.tags !== undefined ? (data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null) : currentLink.tags
	};

	const [updated] = await db.update(links).set(updatePayload).where(eq(links.id, id)).returning();

	// Invalidate both old and new slug in cache
	await linkCache.invalidate(null, currentLink.slug);
	if (newSlug !== currentLink.slug) {
		await linkCache.invalidate(null, newSlug);
	}

	return json(updated);
};

export const DELETE: RequestHandler = async ({ url, request, locals, cookies }) => {
	const auth = await authenticateApiRequest(request, locals, cookies);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing link id' }, { status: 400 });
	}

	const [link] = await db
		.select()
		.from(links)
		.where(and(eq(links.id, id), eq(links.workspaceId, auth.workspaceId)))
		.limit(1);
	if (link) {
		await db.delete(links).where(and(eq(links.id, id), eq(links.workspaceId, auth.workspaceId)));
		await linkCache.invalidate(null, link.slug);
	}

	return json({ success: true, id });
};
