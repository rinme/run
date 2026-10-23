import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

const optionalString = () => z.string().optional().default('');

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'The database connection string.',
		schema: z.string().min(1, 'DATABASE_URL is required')
	},
	DATABASE_AUTH_TOKEN: {
		description: 'Auth token for the remote Turso database (optional for local SQLite).',
		schema: optionalString()
	},
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.',
		schema: z.string().min(1, 'ORIGIN is required')
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy.',
		schema: z.string().min(1, 'BETTER_AUTH_SECRET is required')
	},
	SITE_TOKEN: {
		description: 'Secret token used to HMAC sign NSFW age verification tokens.',
		schema: z.string().optional().default('run-default-fallback-secret-2026')
	},
	CRON_SECRET: {
		description: 'Secret authorization token for Vercel Cron endpoints.',
		schema: optionalString()
	},
	REDIS_URL: {
		description: 'Standard TCP Redis connection URL (e.g. redis://default:xxx@host:port).',
		schema: optionalString()
	},
	UPSTASH_REDIS_REST_URL: {
		description: 'Upstash Redis / Vercel KV REST URL for caching.',
		schema: optionalString()
	},
	UPSTASH_REDIS_REST_TOKEN: {
		description: 'Upstash Redis / Vercel KV REST Token.',
		schema: optionalString()
	},
	TINYBIRD_API_URL: {
		description: 'Tinybird API URL for click analytics ingestion.',
		schema: optionalString()
	},
	TINYBIRD_TOKEN: {
		description: 'Tinybird ingest token.',
		schema: optionalString()
	},
	GOOGLE_GENERATIVE_AI_API_KEY: {
		description: 'Google Gemini API key for AI slug and metadata suggestions.',
		schema: optionalString()
	},
	VERCEL_BEARER_TOKEN: {
		description: 'Vercel API token for managing custom domains.',
		schema: optionalString()
	},
	VERCEL_PROJECT_ID: {
		description: 'Vercel project ID for custom domain assignments.',
		schema: optionalString()
	},
	BLOB_READ_WRITE_TOKEN: {
		description: 'Vercel Blob token for automated backups.',
		schema: optionalString()
	}
});
