import { db } from '#lib/server/db/index.ts';
import {
	links,
	domains,
	utmTemplates,
	inviteCodes,
	siteSettings,
	webhooks,
	type Link,
	type Domain,
	type UtmTemplate,
	type InviteCode,
	type Webhook
} from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';

export const AVAILABLE_DATASETS = [
	'links',
	'domains',
	'utmTemplates',
	'webhooks',
	'siteSettings',
	'inviteCodes'
] as const;

export type DatasetKey = (typeof AVAILABLE_DATASETS)[number];

export interface DatasetInfo {
	id: DatasetKey;
	label: string;
	description: string;
}

export const DATASET_METADATA: DatasetInfo[] = [
	{ id: 'links', label: 'Links & Routing', description: 'Short links, targets, delivery modes & UTM rules' },
	{ id: 'domains', label: 'Custom Domains', description: 'Configured domains and fallback destinations' },
	{ id: 'utmTemplates', label: 'UTM Templates', description: 'Saved UTM tracking presets and campaign tags' },
	{ id: 'webhooks', label: 'Webhooks & Discord', description: 'Event streams, endpoints, and embed customizations' },
	{ id: 'siteSettings', label: 'Site Settings', description: 'General, Auth, Email & Feature flag configurations' },
	{ id: 'inviteCodes', label: 'Invite Codes', description: 'VIP access keys, role bindings, and usage counts' }
];

export function filterValidDatasets(keys: string[]): DatasetKey[] {
	const validSet = new Set<string>(AVAILABLE_DATASETS);
	return keys.filter((k): k is DatasetKey => validSet.has(k));
}

/**
 * Normalizes dates from serialized backup JSON (ISO string / number / Date) into Date or null
 */
function toDate(val: any): Date | null {
	if (!val) return null;
	if (val instanceof Date) return val;
	const d = new Date(val);
	return isNaN(d.getTime()) ? null : d;
}

/**
 * Normalizes booleans
 */
function toBool(val: any): boolean {
	return val === true || val === 1 || val === 'true';
}

/**
 * Exports selected database tables as structured datasets
 */
export async function exportDatasets(selectedKeys?: string[]) {
	const keysToExport = selectedKeys && selectedKeys.length > 0
		? filterValidDatasets(selectedKeys)
		: [...AVAILABLE_DATASETS];

	const datasets: Partial<Record<DatasetKey, any[]>> = {};
	const stats: Record<string, number> = {};

	await Promise.all(
		keysToExport.map(async (key) => {
			switch (key) {
				case 'links': {
					const rows = await db.select().from(links);
					datasets.links = rows;
					stats.links = rows.length;
					break;
				}
				case 'domains': {
					const rows = await db.select().from(domains);
					datasets.domains = rows;
					stats.domains = rows.length;
					break;
				}
				case 'utmTemplates': {
					const rows = await db.select().from(utmTemplates);
					datasets.utmTemplates = rows;
					stats.utmTemplates = rows.length;
					break;
				}
				case 'webhooks': {
					const rows = await db.select().from(webhooks);
					datasets.webhooks = rows;
					stats.webhooks = rows.length;
					break;
				}
				case 'siteSettings': {
					const rows = await db.select().from(siteSettings);
					datasets.siteSettings = rows;
					stats.siteSettings = rows.length;
					break;
				}
				case 'inviteCodes': {
					const rows = await db.select().from(inviteCodes);
					datasets.inviteCodes = rows;
					stats.inviteCodes = rows.length;
					break;
				}
			}
		})
	);

	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		stats,
		datasets
	};
}

export interface RestoreOptions {
	overwrite?: boolean;
	fallbackWorkspaceId?: string;
}

export interface RestoreResult {
	success: boolean;
	stats: {
		links: { inserted: number; updated: number; skipped: number };
		domains: { inserted: number; updated: number; skipped: number };
		utmTemplates: { inserted: number; updated: number; skipped: number };
		webhooks: { inserted: number; updated: number; skipped: number };
		siteSettings: { inserted: number; updated: number; skipped: number };
		inviteCodes: { inserted: number; updated: number; skipped: number };
	};
	errors: string[];
}

/**
 * Restores datasets into the database with optional overwrite/merge logic.
 */
export async function restoreDatasets(
	datasets: Record<string, any[]>,
	options: RestoreOptions = {}
): Promise<RestoreResult> {
	const overwrite = options.overwrite ?? true;
	const result: RestoreResult = {
		success: true,
		stats: {
			links: { inserted: 0, updated: 0, skipped: 0 },
			domains: { inserted: 0, updated: 0, skipped: 0 },
			utmTemplates: { inserted: 0, updated: 0, skipped: 0 },
			webhooks: { inserted: 0, updated: 0, skipped: 0 },
			siteSettings: { inserted: 0, updated: 0, skipped: 0 },
			inviteCodes: { inserted: 0, updated: 0, skipped: 0 }
		},
		errors: []
	};

	// 1. Restore Site Settings
	if (Array.isArray(datasets.siteSettings)) {
		for (const setting of datasets.siteSettings) {
			try {
				if (!setting.key || setting.value === undefined) continue;
				const strValue = typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value);

				const [existing] = await db.select().from(siteSettings).where(eq(siteSettings.key, setting.key));
				if (existing) {
					if (overwrite) {
						await db.update(siteSettings).set({ value: strValue, updatedAt: new Date() }).where(eq(siteSettings.key, setting.key));
						result.stats.siteSettings.updated++;
					} else {
						result.stats.siteSettings.skipped++;
					}
				} else {
					await db.insert(siteSettings).values({ key: setting.key, value: strValue, updatedAt: new Date() });
					result.stats.siteSettings.inserted++;
				}
			} catch (err: any) {
				result.errors.push(`siteSettings '${setting.key}': ${err.message}`);
			}
		}
	}

	// 2. Restore Domains
	if (Array.isArray(datasets.domains)) {
		for (const d of datasets.domains) {
			try {
				if (!d.name) continue;
				const [existing] = await db.select().from(domains).where(eq(domains.name, d.name));
				const domainData = {
					name: d.name,
					workspaceId: d.workspaceId || options.fallbackWorkspaceId || 'default',
					verified: toBool(d.verified),
					primary: toBool(d.primary),
					fallbackUrl: d.fallbackUrl || null,
					updatedAt: new Date()
				};

				if (existing) {
					if (overwrite) {
						await db.update(domains).set(domainData).where(eq(domains.id, existing.id));
						result.stats.domains.updated++;
					} else {
						result.stats.domains.skipped++;
					}
				} else {
					await db.insert(domains).values({
						id: d.id || crypto.randomUUID(),
						...domainData,
						createdAt: toDate(d.createdAt) || new Date()
					});
					result.stats.domains.inserted++;
				}
			} catch (err: any) {
				result.errors.push(`domain '${d.name}': ${err.message}`);
			}
		}
	}

	// 3. Restore Invite Codes
	if (Array.isArray(datasets.inviteCodes)) {
		for (const inv of datasets.inviteCodes) {
			try {
				if (!inv.code) continue;
				const [existing] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, inv.code));
				const inviteData = {
					maxUses: typeof inv.maxUses === 'number' ? inv.maxUses : 1,
					usedCount: typeof inv.usedCount === 'number' ? inv.usedCount : 0,
					role: inv.role || 'member',
					expiresAt: toDate(inv.expiresAt),
					isActive: toBool(inv.isActive)
				};

				if (existing) {
					if (overwrite) {
						await db.update(inviteCodes).set(inviteData).where(eq(inviteCodes.id, existing.id));
						result.stats.inviteCodes.updated++;
					} else {
						result.stats.inviteCodes.skipped++;
					}
				} else {
					await db.insert(inviteCodes).values({
						id: inv.id || crypto.randomUUID(),
						code: inv.code,
						creatorId: inv.creatorId || null,
						...inviteData,
						createdAt: toDate(inv.createdAt) || new Date()
					});
					result.stats.inviteCodes.inserted++;
				}
			} catch (err: any) {
				result.errors.push(`inviteCode '${inv.code}': ${err.message}`);
			}
		}
	}

	// 4. Restore UTM Templates
	if (Array.isArray(datasets.utmTemplates)) {
		for (const utm of datasets.utmTemplates) {
			try {
				if (!utm.name) continue;
				const utmData = {
					name: utm.name,
					workspaceId: utm.workspaceId || options.fallbackWorkspaceId || 'default',
					utmSource: utm.utmSource || null,
					utmMedium: utm.utmMedium || null,
					utmCampaign: utm.utmCampaign || null,
					utmTerm: utm.utmTerm || null,
					utmContent: utm.utmContent || null
				};

				let existing = null;
				if (utm.id) {
					[existing] = await db.select().from(utmTemplates).where(eq(utmTemplates.id, utm.id));
				}
				if (existing) {
					if (overwrite) {
						await db.update(utmTemplates).set(utmData).where(eq(utmTemplates.id, existing.id));
						result.stats.utmTemplates.updated++;
					} else {
						result.stats.utmTemplates.skipped++;
					}
				} else {
					await db.insert(utmTemplates).values({
						id: utm.id || crypto.randomUUID(),
						...utmData,
						createdAt: toDate(utm.createdAt) || new Date()
					});
					result.stats.utmTemplates.inserted++;
				}
			} catch (err: any) {
				result.errors.push(`utmTemplate '${utm.name}': ${err.message}`);
			}
		}
	}

	// 5. Restore Webhooks
	if (Array.isArray(datasets.webhooks)) {
		for (const hook of datasets.webhooks) {
			try {
				if (!hook.url) continue;
				const hookData = {
					name: hook.name || 'Webhook',
					url: hook.url,
					workspaceId: hook.workspaceId || options.fallbackWorkspaceId || 'default',
					secret: hook.secret || null,
					events: typeof hook.events === 'string' ? hook.events : JSON.stringify(hook.events || ['link.clicked']),
					isActive: toBool(hook.isActive),
					isDiscord: toBool(hook.isDiscord),
					discordConfig: typeof hook.discordConfig === 'string' ? hook.discordConfig : hook.discordConfig ? JSON.stringify(hook.discordConfig) : null,
					updatedAt: new Date()
				};

				let existing = null;
				if (hook.id) {
					[existing] = await db.select().from(webhooks).where(eq(webhooks.id, hook.id));
				}
				if (existing) {
					if (overwrite) {
						await db.update(webhooks).set(hookData).where(eq(webhooks.id, existing.id));
						result.stats.webhooks.updated++;
					} else {
						result.stats.webhooks.skipped++;
					}
				} else {
					await db.insert(webhooks).values({
						id: hook.id || crypto.randomUUID(),
						...hookData,
						createdAt: toDate(hook.createdAt) || new Date()
					});
					result.stats.webhooks.inserted++;
				}
			} catch (err: any) {
				result.errors.push(`webhook '${hook.url}': ${err.message}`);
			}
		}
	}

	// 6. Restore Links
	if (Array.isArray(datasets.links)) {
		for (const l of datasets.links) {
			try {
				if (!l.slug || !l.destinationUrl) continue;
				const [existing] = await db.select().from(links).where(eq(links.slug, l.slug));

				const linkData = {
					slug: l.slug,
					destinationUrl: l.destinationUrl,
					workspaceId: l.workspaceId || options.fallbackWorkspaceId || 'default',
					domainId: l.domainId || null,
					title: l.title || null,
					description: l.description || null,
					image: l.image || null,
					deliveryMode: l.deliveryMode || 'direct',
					passwordHash: l.passwordHash || null,
					cloakedTitle: l.cloakedTitle || null,
					cloakedDescription: l.cloakedDescription || null,
					cloakedFavicon: l.cloakedFavicon || null,
					minAge: typeof l.minAge === 'number' ? l.minAge : 18,
					interstitialHeading: l.interstitialHeading || null,
					interstitialMessage: l.interstitialMessage || null,
					interstitialButtonText: l.interstitialButtonText || null,
					interstitialDelaySeconds: typeof l.interstitialDelaySeconds === 'number' ? l.interstitialDelaySeconds : 5,
					reverseProxyStripHeaders: l.reverseProxyStripHeaders ? JSON.stringify(l.reverseProxyStripHeaders) : null,
					targetingRules: typeof l.targetingRules === 'string' ? l.targetingRules : l.targetingRules ? JSON.stringify(l.targetingRules) : null,
					utmSource: l.utmSource || null,
					utmMedium: l.utmMedium || null,
					utmCampaign: l.utmCampaign || null,
					utmTerm: l.utmTerm || null,
					utmContent: l.utmContent || null,
					expiresAt: toDate(l.expiresAt),
					clickLimit: typeof l.clickLimit === 'number' ? l.clickLimit : null,
					isActive: toBool(l.isActive),
					updatedAt: new Date()
				};

				if (existing) {
					if (overwrite) {
						await db.update(links).set(linkData).where(eq(links.id, existing.id));
						result.stats.links.updated++;
					} else {
						result.stats.links.skipped++;
					}
				} else {
					await db.insert(links).values({
						id: l.id || crypto.randomUUID(),
						...linkData,
						currentClicks: typeof l.clicks === 'number' ? l.clicks : (typeof l.currentClicks === 'number' ? l.currentClicks : 0),
						createdAt: toDate(l.createdAt) || new Date()
					});
					result.stats.links.inserted++;
				}
			} catch (err: any) {
				result.errors.push(`link '${l.slug}': ${err.message}`);
			}
		}
	}

	result.success = result.errors.length === 0;
	return result;
}
