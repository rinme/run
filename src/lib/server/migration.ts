import { z } from 'zod';
import type { Link, NewLink, DeliveryMode } from './db/schema.ts';
import { hashPassword } from './security.ts';
import { RESERVED_PATHS } from './resolver.ts';

/**
 * Sink Link Schema (compatible with Sink v1.0)
 */
export interface SinkLink {
	id?: string;
	url: string;
	slug: string;
	comment?: string;
	expiration?: number; // Unix seconds
	title?: string;
	description?: string;
	image?: string;
	apple?: string;
	google?: string;
	cloaking?: boolean;
	redirectWithQuery?: boolean;
	proxy?: boolean;
	password?: string;
	unsafe?: boolean;
	geo?: Record<string, string>;
	timer?: number;
	nsfw?: boolean;
	tags?: string[];
	createdAt?: number; // Unix seconds
	updatedAt?: number; // Unix seconds
}

export interface SinkExportData {
	version: string;
	exportedAt?: string;
	count?: number;
	links: SinkLink[];
	cursor?: string;
	list_complete?: boolean;
}

/**
 * Run Export Schema
 */
export interface RunExportData {
	version: string;
	exportedAt: string;
	generator: 'run';
	count: number;
	links: Link[];
}

export type DetectedFormat = 'sink' | 'run' | 'unknown';

export interface ImportOptions {
	conflictStrategy: 'skip' | 'overwrite' | 'rename';
	targetDomainId?: string | null;
	remapDomainUrl?: string | null; // e.g. "mycustomdomain.com"
	useOriginDomain?: boolean;
}

export interface PreparedImportLink {
	index: number;
	slug: string;
	destinationUrl: string;
	link: NewLink;
	originalData: any;
}

export interface ImportErrorItem {
	index: number;
	slug: string;
	url: string;
	reason: string;
}

export interface ImportSuccessItem {
	index: number;
	slug: string;
	url: string;
	action: 'created' | 'updated' | 'renamed';
}

export interface ImportSkippedItem {
	index: number;
	slug: string;
	url: string;
	reason: string;
}

export interface ImportResult {
	format: DetectedFormat;
	total: number;
	success: number;
	skipped: number;
	failed: number;
	successItems: ImportSuccessItem[];
	skippedItems: ImportSkippedItem[];
	failedItems: ImportErrorItem[];
}

/**
 * Automatically inspects a parsed JSON object to detect if it's Sink format or Run format.
 */
export function detectFormat(data: any): DetectedFormat {
	if (!data || typeof data !== 'object') return 'unknown';

	// Case 1: Array of links
	const linksArray: any[] = Array.isArray(data)
		? data
		: Array.isArray(data.links)
			? data.links
			: Array.isArray(data.data?.links)
				? data.data.links
				: [];

	if (linksArray.length === 0) {
		// Could be an empty export
		if (data.generator === 'run' || data.totalLinks !== undefined) return 'run';
		if (data.version && ('cursor' in data || 'list_complete' in data)) return 'sink';
		return 'unknown';
	}

	const sample = linksArray[0];
	if (!sample || typeof sample !== 'object') return 'unknown';

	// Run specific fields
	if ('destinationUrl' in sample || 'deliveryMode' in sample || 'isArchived' in sample) {
		return 'run';
	}

	// Sink specific fields
	if ('url' in sample && ('cloaking' in sample || 'proxy' in sample || 'apple' in sample || 'google' in sample || 'nsfw' in sample || 'timer' in sample || typeof sample.expiration === 'number')) {
		return 'sink';
	}

	if ('url' in sample && !('destinationUrl' in sample)) {
		return 'sink';
	}

	if ('destinationUrl' in sample) {
		return 'run';
	}

	return 'unknown';
}

/**
 * Extract links array from arbitrary JSON payload
 */
export function extractLinksArray(payload: any): any[] {
	if (Array.isArray(payload)) return payload;
	if (payload && Array.isArray(payload.links)) return payload.links;
	if (payload?.data && Array.isArray(payload.data.links)) return payload.data.links;
	return [];
}

/**
 * Convert a Sink link object into Run's NewLink format
 */
export async function convertSinkToRunLink(
	sinkLink: SinkLink,
	workspaceId: string,
	options: ImportOptions = { conflictStrategy: 'skip' }
): Promise<NewLink> {
	let destinationUrl = (sinkLink.url || '').trim();

	// Remap URL domain if requested
	if (options.remapDomainUrl && destinationUrl) {
		try {
			const parsed = new URL(destinationUrl);
			// Replace hostname with target
			const cleanTarget = options.remapDomainUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
			parsed.hostname = cleanTarget;
			destinationUrl = parsed.toString();
		} catch {
			// keep original if invalid URL
		}
	}

	// Determine Delivery Mode
	let deliveryMode: DeliveryMode = 'direct';
	let passwordHash: string | null = null;
	let interstitialDuration = 5;

	if (sinkLink.proxy) {
		deliveryMode = 'reverse_proxy';
	} else if (sinkLink.cloaking) {
		deliveryMode = 'cloaked';
	} else if (sinkLink.nsfw) {
		deliveryMode = 'age_gate';
	} else if (sinkLink.timer && sinkLink.timer > 0) {
		deliveryMode = 'interstitial';
		interstitialDuration = Math.min(Math.max(sinkLink.timer, 1), 60);
	} else if (sinkLink.password) {
		deliveryMode = 'password';
		if (!sinkLink.password.startsWith('[MASKED]')) {
			passwordHash = await hashPassword(sinkLink.password);
		}
	}

	// Map device routing: apple -> ios, google -> android
	let deviceRouting: string | null = null;
	if (sinkLink.apple || sinkLink.google) {
		deviceRouting = JSON.stringify({
			ios: sinkLink.apple || undefined,
			android: sinkLink.google || undefined
		});
	}

	// Map geo routing
	let geoRouting: string | null = null;
	if (sinkLink.geo && typeof sinkLink.geo === 'object' && Object.keys(sinkLink.geo).length > 0) {
		geoRouting = JSON.stringify(sinkLink.geo);
	}

	// Map tags
	let tags: string | null = null;
	if (Array.isArray(sinkLink.tags) && sinkLink.tags.length > 0) {
		tags = JSON.stringify(sinkLink.tags.map((t) => String(t).trim().toLowerCase()));
	}

	// Map expiration: seconds -> ms Date
	let expiresAt: Date | null = null;
	if (typeof sinkLink.expiration === 'number' && sinkLink.expiration > 0) {
		expiresAt = new Date(sinkLink.expiration * 1000);
	}

	// Timestamps
	const createdAt = sinkLink.createdAt ? new Date(sinkLink.createdAt * 1000) : new Date();
	const updatedAt = sinkLink.updatedAt ? new Date(sinkLink.updatedAt * 1000) : new Date();

	return {
		workspaceId,
		domainId: options.targetDomainId ?? null,
		slug: sinkLink.slug.trim(),
		destinationUrl,
		deliveryMode,
		passwordHash,
		interstitialDuration,
		expiresAt,
		redirectWithQuery: sinkLink.redirectWithQuery !== false,
		deviceRouting,
		geoRouting,
		tags,
		title: sinkLink.title || null,
		description: sinkLink.description || sinkLink.comment || null,
		image: sinkLink.image || null,
		isArchived: false,
		createdAt,
		updatedAt
	};
}

/**
 * Convert a Run Link record into a Sink-compatible Link object
 */
export function convertRunToSinkLink(runLink: Link): SinkLink {
	// Parse device routing
	let apple: string | undefined;
	let google: string | undefined;
	if (runLink.deviceRouting) {
		try {
			const parsed = JSON.parse(runLink.deviceRouting);
			if (parsed.ios) apple = parsed.ios;
			if (parsed.android) google = parsed.android;
		} catch {}
	}

	// Parse geo routing
	let geo: Record<string, string> | undefined;
	if (runLink.geoRouting) {
		try {
			geo = JSON.parse(runLink.geoRouting);
		} catch {}
	}

	// Parse tags
	let tags: string[] | undefined;
	if (runLink.tags) {
		try {
			const parsed = JSON.parse(runLink.tags);
			if (Array.isArray(parsed)) tags = parsed;
		} catch {}
	}

	// Convert expiration to Unix seconds
	const expiration = runLink.expiresAt ? Math.floor(new Date(runLink.expiresAt).getTime() / 1000) : undefined;
	const createdAt = runLink.createdAt ? Math.floor(new Date(runLink.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
	const updatedAt = runLink.updatedAt ? Math.floor(new Date(runLink.updatedAt).getTime() / 1000) : createdAt;

	return {
		id: runLink.id,
		slug: runLink.slug,
		url: runLink.destinationUrl,
		title: runLink.title || undefined,
		description: runLink.description || undefined,
		image: runLink.image || undefined,
		cloaking: runLink.deliveryMode === 'cloaked',
		proxy: runLink.deliveryMode === 'reverse_proxy',
		nsfw: runLink.deliveryMode === 'age_gate',
		timer: runLink.deliveryMode === 'interstitial' ? runLink.interstitialDuration || 5 : undefined,
		password: runLink.deliveryMode === 'password' ? '[MASKED]' : undefined,
		redirectWithQuery: runLink.redirectWithQuery,
		apple,
		google,
		geo,
		tags,
		expiration,
		createdAt,
		updatedAt
	};
}
