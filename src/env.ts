import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	DATABASE_AUTH_TOKEN: {
		description: 'Auth token for the [Turso](https://turso.tech) database.'
	},
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy.'
	},
	SITE_TOKEN: {
		description: 'Secret token used to HMAC sign NSFW age verification tokens.'
	},
	UPSTASH_REDIS_REST_URL: {
		description: 'Upstash Redis / Vercel KV REST URL for caching.'
	},
	UPSTASH_REDIS_REST_TOKEN: {
		description: 'Upstash Redis / Vercel KV REST Token.'
	},
	TINYBIRD_API_URL: {
		description: 'Tinybird API URL for click analytics ingestion.'
	},
	TINYBIRD_TOKEN: {
		description: 'Tinybird ingest token.'
	},
	GOOGLE_GENERATIVE_AI_API_KEY: {
		description: 'Google Gemini API key for AI slug and metadata suggestions.'
	},
	VERCEL_BEARER_TOKEN: {
		description: 'Vercel API token for managing custom domains.'
	},
	VERCEL_PROJECT_ID: {
		description: 'Vercel project ID for custom domain assignments.'
	}
});
