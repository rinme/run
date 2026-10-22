import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

let databaseUrl = process.env.DATABASE_URL || 'file:local.db';
let databaseAuthToken = process.env.DATABASE_AUTH_TOKEN || '';

try {
	// Dynamically load SvelteKit env if running inside SvelteKit
	const privateEnv = await import('$app/env/private');
	if (privateEnv.DATABASE_URL) databaseUrl = privateEnv.DATABASE_URL;
	if (privateEnv.DATABASE_AUTH_TOKEN) databaseAuthToken = privateEnv.DATABASE_AUTH_TOKEN;
} catch {
	// Running in standalone script/migration outside SvelteKit
}

const isLocalFile = databaseUrl.startsWith('file:');
if (!isLocalFile && !databaseAuthToken) {
	throw new Error('DATABASE_AUTH_TOKEN is not set for remote database');
}

const client = createClient({
	url: databaseUrl,
	authToken: isLocalFile ? undefined : databaseAuthToken
});

export const db = drizzle(client, { schema });
