import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { domains } from '#lib/server/db/schema.ts';
import { authenticateApiRequest } from '#lib/server/api-auth.ts';
import { eq, desc, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ request, locals, cookies }) => {
	const auth = await authenticateApiRequest(request, locals, cookies);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const allDomains = await db
		.select()
		.from(domains)
		.where(eq(domains.workspaceId, auth.workspaceId))
		.orderBy(desc(domains.createdAt));
	return json(allDomains);
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	const auth = await authenticateApiRequest(request, locals, cookies);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();
	const name = (data.name || '').trim().toLowerCase();
	const fallbackUrl = data.fallbackUrl || null;

	if (!name) {
		return json({ error: 'Domain name is required' }, { status: 400 });
	}

	// Basic hostname validation
	if (!name.includes('.') || name.includes(' ') || name.includes('/')) {
		return json({ error: 'Please enter a valid domain or subdomain (e.g., go.mybrand.com)' }, { status: 400 });
	}

	const existing = await db.select().from(domains).where(eq(domains.name, name)).limit(1);
	if (existing.length > 0) {
		return json({ error: 'This domain is already registered.' }, { status: 409 });
	}

	const workspaceId = auth.workspaceId;

	const [created] = await db
		.insert(domains)
		.values({
			workspaceId,
			name,
			fallbackUrl,
			verified: false,
			primary: false
		})
		.returning();

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
		return json({ error: 'Missing domain ID' }, { status: 400 });
	}

	const [existingDomain] = await db
		.select()
		.from(domains)
		.where(and(eq(domains.id, id), eq(domains.workspaceId, auth.workspaceId)))
		.limit(1);

	if (!existingDomain) {
		return json({ error: 'Domain not found' }, { status: 404 });
	}

	const updatePayload: { verified?: boolean; primary?: boolean; fallbackUrl?: string } = {};
	if (data.verified !== undefined) updatePayload.verified = Boolean(data.verified);
	if (data.primary !== undefined) updatePayload.primary = Boolean(data.primary);
	if (data.fallbackUrl !== undefined) updatePayload.fallbackUrl = data.fallbackUrl;

	const [updated] = await db
		.update(domains)
		.set(updatePayload)
		.where(and(eq(domains.id, id), eq(domains.workspaceId, auth.workspaceId)))
		.returning();
	return json(updated);
};

export const DELETE: RequestHandler = async ({ url, request, locals, cookies }) => {
	const auth = await authenticateApiRequest(request, locals, cookies);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing domain id' }, { status: 400 });
	}

	await db
		.delete(domains)
		.where(and(eq(domains.id, id), eq(domains.workspaceId, auth.workspaceId)));
	return json({ success: true, id });
};
