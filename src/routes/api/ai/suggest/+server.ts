import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { GOOGLE_GENERATIVE_AI_API_KEY } from '$app/env/private';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const targetUrl = body.url;

	if (!targetUrl) {
		return json({ error: 'Missing target URL' }, { status: 400 });
	}

	// 1. If Gemini API key is configured, call Gemini
	if (GOOGLE_GENERATIVE_AI_API_KEY) {
		try {
			const google = createGoogleGenerativeAI({
				apiKey: GOOGLE_GENERATIVE_AI_API_KEY
			});

			const prompt = `You are a link shortener AI assistant for "Run".
Target URL: "${targetUrl}"
Task:
1. Suggest 3 short, catchy, memorable, lowercase URL slugs (only alphanumeric and hyphens, 4-10 chars each).
2. Suggest a concise 1-sentence title/summary.
3. Suggest 3 relevant topical tags.

Return strictly JSON in this exact format:
{
  "slugs": ["slug1", "slug2", "slug3"],
  "summary": "Concise summary",
  "tags": ["tag1", "tag2", "tag3"]
}`;

			const { text } = await generateText({
				model: google('gemini-2.0-flash'),
				prompt
			});

			// Extract JSON from response
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				return json(parsed);
			}
		} catch (e) {
			console.warn('Gemini API call error, falling back to heuristic:', e);
		}
	}

	// 2. Fallback heuristic generator when API key is not yet set
	try {
		const parsedUrl = new URL(targetUrl);
		const hostname = parsedUrl.hostname.replace(/^www\./, '').split('.')[0];
		const pathSlug = parsedUrl.pathname
			.split('/')
			.filter(Boolean)
			.pop()
			?.slice(0, 10)
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '-');

		const base = pathSlug || hostname;
		const rand = Math.floor(100 + Math.random() * 900);

		return json({
			slugs: [`${base}`, `${base}-${rand}`, `${hostname}-go`],
			summary: `Short link for ${parsedUrl.hostname}`,
			tags: [hostname, 'link', 'web']
		});
	} catch {
		return json({
			slugs: [`run-${Math.floor(1000 + Math.random() * 9000)}`],
			summary: 'Shortened link',
			tags: ['link']
		});
	}
};
