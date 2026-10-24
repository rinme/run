import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links, type NewLink } from '#lib/server/db/schema.ts';
import { linkCache } from '#lib/server/cache.ts';
import { authenticateApiRequest, getOrCreateDefaultWorkspace } from '#lib/server/api-auth.ts';
import { RESERVED_PATHS } from '#lib/server/resolver.ts';
import {
	detectFormat,
	extractLinksArray,
	convertSinkToRunLink,
	type DetectedFormat,
	type ImportOptions,
	type ImportResult,
	type ImportSuccessItem,
	type ImportSkippedItem,
	type ImportErrorItem
} from '#lib/server/migration.ts';
import { eq, and } from 'drizzle-orm';

function randomSuffix(): string {
	return Math.random().toString(36).substring(2, 6);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const auth = await authenticateApiRequest(request, locals);
	if (!auth.authenticated) {
		return json({ error: auth.error || 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const rawPayload = body.payload ?? body;

	// Determine format
	let requestedFormat: DetectedFormat = body.format || 'auto';
	if (requestedFormat === 'auto') {
		requestedFormat = detectFormat(rawPayload);
	}

	const rawLinks = extractLinksArray(rawPayload);
	if (!rawLinks || rawLinks.length === 0) {
		return json({ error: 'No links found in imported payload' }, { status: 400 });
	}

	const MAX_IMPORT_LIMIT = 5000;
	if (rawLinks.length > MAX_IMPORT_LIMIT) {
		return json({ error: `Exceeded maximum limit of ${MAX_IMPORT_LIMIT} links per import request.` }, { status: 400 });
	}

	const workspaceId = auth.workspaceId || (await getOrCreateDefaultWorkspace(auth.userId));

	const importOptions: ImportOptions = {
		conflictStrategy: body.conflictStrategy || 'skip',
		targetDomainId: body.targetDomainId || null,
		remapDomainUrl: body.useOriginDomain ? null : (body.remapDomainUrl || null),
		useOriginDomain: body.useOriginDomain ?? false
	};

	const result: ImportResult = {
		format: requestedFormat,
		total: rawLinks.length,
		success: 0,
		skipped: 0,
		failed: 0,
		successItems: [],
		skippedItems: [],
		failedItems: []
	};

	for (let i = 0; i < rawLinks.length; i++) {
		const item = rawLinks[i];
		const originalUrl = item.url || item.destinationUrl || '';

		if (!originalUrl) {
			result.failed++;
			result.failedItems.push({
				index: i,
				slug: item.slug || `item-${i}`,
				url: '',
				reason: 'Missing target destination URL'
			});
			continue;
		}

		let slug = (item.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
		if (!slug) {
			slug = Math.random().toString(36).substring(2, 8);
		}

		if (RESERVED_PATHS.has(slug)) {
			result.failed++;
			result.failedItems.push({
				index: i,
				slug,
				url: originalUrl,
				reason: `Slug "${slug}" is a reserved system path`
			});
			continue;
		}

		try {
			// Convert to NewLink
			let newLink: NewLink;
			if (requestedFormat === 'sink') {
				newLink = await convertSinkToRunLink(item, workspaceId, importOptions);
			} else {
				// Run native format
				let destinationUrl = originalUrl;
				if (importOptions.remapDomainUrl && !importOptions.useOriginDomain) {
					try {
						const parsed = new URL(destinationUrl);
						const cleanTarget = importOptions.remapDomainUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
						parsed.hostname = cleanTarget;
						destinationUrl = parsed.toString();
					} catch {}
				}

				newLink = {
					workspaceId,
					domainId: importOptions.targetDomainId ?? item.domainId ?? null,
					slug,
					destinationUrl,
					deliveryMode: item.deliveryMode || 'direct',
					passwordHash: item.passwordHash || null,
					interstitialDuration: item.interstitialDuration ?? 5,
					expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
					maxClicks: item.maxClicks ?? null,
					currentClicks: item.currentClicks ?? 0,
					expiredRedirectUrl: item.expiredRedirectUrl || null,
					redirectWithQuery: item.redirectWithQuery !== false,
					deviceRouting: typeof item.deviceRouting === 'object' ? JSON.stringify(item.deviceRouting) : item.deviceRouting || null,
					geoRouting: typeof item.geoRouting === 'object' ? JSON.stringify(item.geoRouting) : item.geoRouting || null,
					abSplits: typeof item.abSplits === 'object' ? JSON.stringify(item.abSplits) : item.abSplits || null,
					utmPreset: typeof item.utmPreset === 'object' ? JSON.stringify(item.utmPreset) : item.utmPreset || null,
					tags: typeof item.tags === 'object' ? JSON.stringify(item.tags) : item.tags || null,
					title: item.title || null,
					description: item.description || null,
					image: item.image || null,
					isArchived: false,
					createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
					updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
				};
			}

			// Check collision
			const existing = await db
				.select({ id: links.id, slug: links.slug })
				.from(links)
				.where(eq(links.slug, slug))
				.limit(1);

			if (existing.length > 0) {
				if (importOptions.conflictStrategy === 'skip') {
					result.skipped++;
					result.skippedItems.push({
						index: i,
						slug,
						url: newLink.destinationUrl,
						reason: `Slug "${slug}" already exists`
					});
					continue;
				} else if (importOptions.conflictStrategy === 'overwrite') {
					const existingId = existing[0].id;
					await db
						.update(links)
						.set({
							...newLink,
							updatedAt: new Date()
						})
						.where(eq(links.id, existingId));

					await linkCache.invalidate(null, slug);

					result.success++;
					result.successItems.push({
						index: i,
						slug,
						url: newLink.destinationUrl,
						action: 'updated'
					});
					continue;
				} else if (importOptions.conflictStrategy === 'rename') {
					// Append random suffix until unique
					let candidateSlug = `${slug}-${randomSuffix()}`;
					let attempts = 0;
					while (attempts < 5) {
						const conflict = await db
							.select({ id: links.id })
							.from(links)
							.where(eq(links.slug, candidateSlug))
							.limit(1);
						if (conflict.length === 0 && !RESERVED_PATHS.has(candidateSlug)) {
							break;
						}
						candidateSlug = `${slug}-${randomSuffix()}`;
						attempts++;
					}
					newLink.slug = candidateSlug;
					slug = candidateSlug;
				}
			}

			// Insert link
			await db.insert(links).values(newLink);
			await linkCache.invalidate(null, slug);

			result.success++;
			result.successItems.push({
				index: i,
				slug,
				url: newLink.destinationUrl,
				action: existing.length > 0 ? 'renamed' : 'created'
			});
		} catch (err: any) {
			result.failed++;
			result.failedItems.push({
				index: i,
				slug,
				url: originalUrl,
				reason: err.message || 'Database insert error'
			});
		}
	}

	return json(result);
};
