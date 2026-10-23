import { db } from './db';
import { apiKeys, organization } from './db/schema';
import { eq } from 'drizzle-orm';

export interface ApiAuthResult {
	authenticated: boolean;
	authMethod: 'session' | 'api_key' | 'none';
	workspaceId: string;
	userId?: string;
	scopes?: string[];
	error?: string;
}

/**
 * Computes SHA-256 hex hash of an API token
 */
export async function hashApiToken(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token.trim()));
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Authenticates an incoming request using either a Better Auth session
 * OR a Bearer API token ("run_live_...")
 */
export async function authenticateApiRequest(
	request: Request,
	locals: App.Locals
): Promise<ApiAuthResult> {
	// 1. Check Better Auth session from cookie
	if (locals.user) {
		const org = await db.query?.organization?.findFirst?.();
		const workspaceId =
			(locals.session as { activeOrganizationId?: string } | undefined)?.activeOrganizationId ||
			org?.id ||
			'default-workspace';

		return {
			authenticated: true,
			authMethod: 'session',
			workspaceId,
			userId: locals.user.id,
			scopes: ['*']
		};
	}

	// 2. Check Authorization Bearer header
	const authHeader = request.headers.get('authorization') || '';
	if (authHeader.startsWith('Bearer ')) {
		const token = authHeader.substring(7).trim();
		if (token.startsWith('run_live_')) {
			try {
				const keyHash = await hashApiToken(token);
				const [apiKey] = await db
					.select()
					.from(apiKeys)
					.where(eq(apiKeys.keyHash, keyHash))
					.limit(1);

				if (apiKey) {
					// Check expiration
					if (apiKey.expiresAt && new Date() > new Date(apiKey.expiresAt)) {
						return {
							authenticated: false,
							authMethod: 'api_key',
							workspaceId: apiKey.workspaceId,
							error: 'API key has expired'
						};
					}

					// Asynchronously update lastUsedAt
					db.update(apiKeys)
						.set({ lastUsedAt: new Date() })
						.where(eq(apiKeys.id, apiKey.id))
						.catch(() => {});

					let scopes = ['*'];
					try {
						scopes = JSON.parse(apiKey.scopes);
					} catch {}

					return {
						authenticated: true,
						authMethod: 'api_key',
						workspaceId: apiKey.workspaceId,
						scopes
					};
				}
			} catch (e) {
				return {
					authenticated: false,
					authMethod: 'api_key',
					workspaceId: 'default-workspace',
					error: 'API key verification error'
				};
			}
		}
	}

	return {
		authenticated: false,
		authMethod: 'none',
		workspaceId: 'default-workspace',
		error: 'Authentication required. Provide a valid Bearer token or sign in.'
	};
}
