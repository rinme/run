import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { apiKeys } from '#lib/server/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

function hashToken(token: string): string {
	const enc = new TextEncoder();
	return Array.from(new Uint8Array(crypto.getRandomValues(new Uint8Array(32))))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const GET: RequestHandler = async () => {
	const keys = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			scopes: apiKeys.scopes,
			createdAt: apiKeys.createdAt,
			lastUsedAt: apiKeys.lastUsedAt,
			expiresAt: apiKeys.expiresAt
		})
		.from(apiKeys)
		.orderBy(desc(apiKeys.createdAt));

	return json(keys);
};

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();
	const name = (data.name || 'API Token').trim();
	const scopes = Array.isArray(data.scopes) && data.scopes.length > 0 ? data.scopes : ['*'];

	// Generate secret key: run_live_<random_bytes>
	const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	const secretToken = `run_live_${randomPart}`;
	const keyPrefix = secretToken.slice(0, 14);

	// Generate SHA-256 hash of the secret
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secretToken));
	const keyHash = Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	const org = await db.query?.organization?.findFirst?.();
	const workspaceId = org?.id || 'default-workspace';

	const [created] = await db
		.insert(apiKeys)
		.values({
			workspaceId,
			name,
			keyPrefix,
			keyHash,
			scopes: JSON.stringify(scopes)
		})
		.returning();

	return json(
		{
			token: secretToken,
			key: {
				id: created.id,
				name: created.name,
				keyPrefix: created.keyPrefix,
				scopes: created.scopes,
				createdAt: created.createdAt
			}
		},
		{ status: 201 }
	);
};

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing key ID' }, { status: 400 });
	}

	await db.delete(apiKeys).where(eq(apiKeys.id, id));
	return json({ success: true, id });
};
