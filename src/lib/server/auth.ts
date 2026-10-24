import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, bearer } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true },
	advanced: {
		ipAddress: {
			ipAddressHeaders: [
				'cf-connecting-ip',
				'true-client-ip',
				'x-vercel-forwarded-for',
				'x-real-ip',
				'x-forwarded-for'
			]
		}
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'member'
			}
		}
	},
	plugins: [
		organization(),
		bearer(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
