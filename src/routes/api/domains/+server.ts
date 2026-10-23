import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { domains } from '#lib/server/db/schema.ts';
import { authenticateApiRequest, getOrCreateDefaultWorkspace } from '#lib/server/api-auth.ts';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	const allDomains = await db.select().from(domains).orderBy(desc(domains.createdAt));
	return json(allDomains);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const auth = await authenticateApiRequest(request, locals);
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

	const workspaceId = auth.workspaceId || (await getOrCreateDefaultWorkspace(auth.userId));

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

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const auth = await authenticateApiRequest(request, locals);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const data = await request.json();
	const id = data.id;

	if (!id) {
		return json({ error: 'Missing domain ID' }, { status: 400 });
	}

	const updatePayload: { verified?: boolean; primary?: boolean; fallbackUrl?: string } = {};
	if (data.verified !== undefined) updatePayload.verified = Boolean(data.verified);
	if (data.primary !== undefined) updatePayload.primary = Boolean(data.primary);
	if (data.fallbackUrl !== undefined) updatePayload.fallbackUrl = data.fallbackUrl;

	const [updated] = await db.update(domains).set(updatePayload).where(eq(domains.id, id)).returning();
	return json(updated);
};

export const DELETE: RequestHandler = async ({ url, request, locals }) => {
	const auth = await authenticateApiRequest(request, locals);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing domain id' }, { status: 400 });
	}

	await db.delete(domains).where(eq(domains.id, id));
	return json({ success: true, id });
};
