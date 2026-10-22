import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { organization } from './auth.schema';

export * from './auth.schema';

/**
 * Custom domains configured for workspaces (e.g., go.acme.com)
 */
export const domains = sqliteTable(
	'domains',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		workspaceId: text('workspace_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		name: text('name').notNull().unique(), // e.g. "go.mybrand.com"
		verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
		primary: integer('primary', { mode: 'boolean' }).notNull().default(false),
		fallbackUrl: text('fallback_url'), // 404 / catch-all destination
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('domains_workspaceId_idx').on(table.workspaceId),
		uniqueIndex('domains_name_idx').on(table.name)
	]
);

export type DeliveryMode =
	| 'direct'
	| 'cloaked'
	| 'password'
	| 'age_gate'
	| 'interstitial'
	| 'reverse_proxy';

/**
 * Links table containing all short links, targeting rules, and security delivery modes
 */
export const links = sqliteTable(
	'links',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		workspaceId: text('workspace_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		domainId: text('domain_id').references(() => domains.id, { onDelete: 'set null' }),
		slug: text('slug').notNull(),
		destinationUrl: text('destination_url').notNull(),

		// Delivery & Security Gates
		deliveryMode: text('delivery_mode').$type<DeliveryMode>().notNull().default('direct'),
		passwordHash: text('password_hash'),
		interstitialDuration: integer('interstitial_duration').notNull().default(5),

		// Expiration & Click Limits QoL
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
		maxClicks: integer('max_clicks'),
		currentClicks: integer('current_clicks').notNull().default(0),
		expiredRedirectUrl: text('expired_redirect_url'),

		// Dynamic Forwarding & Routing QoL
		redirectWithQuery: integer('redirect_with_query', { mode: 'boolean' }).notNull().default(true),
		deviceRouting: text('device_routing'), // JSON: { ios?: string, android?: string }
		geoRouting: text('geo_routing'), // JSON: Record<string, string> (e.g. { US: "https://...", DE: "https://..." })
		abSplits: text('ab_splits'), // JSON: Array<{ url: string, weight: number }>

		// UTM & Tagging QoL
		utmPreset: text('utm_preset'), // JSON: { source?: string, medium?: string, campaign?: string, term?: string, content?: string }
		tags: text('tags'), // JSON string array: ["marketing", "launch"]

		// OpenGraph Overrides
		title: text('title'),
		description: text('description'),
		image: text('image'),

		isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('links_workspaceId_idx').on(table.workspaceId),
		index('links_domain_slug_idx').on(table.domainId, table.slug),
		index('links_slug_idx').on(table.slug)
	]
);

/**
 * Workspace API Keys for MCP Server and REST API access
 */
export const apiKeys = sqliteTable(
	'api_keys',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		workspaceId: text('workspace_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		keyHash: text('key_hash').notNull().unique(), // SHA-256 hash of secret token
		keyPrefix: text('key_prefix').notNull(), // e.g. "run_live_abc12"
		scopes: text('scopes').notNull().default('["*"]'), // JSON array of permitted scopes
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
		lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('api_keys_workspaceId_idx').on(table.workspaceId),
		uniqueIndex('api_keys_hash_idx').on(table.keyHash)
	]
);

/**
 * Reusable UTM campaign templates
 */
export const utmTemplates = sqliteTable(
	'utm_templates',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		workspaceId: text('workspace_id')
			.notNull()
			.references(() => organization.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		utmSource: text('utm_source'),
		utmMedium: text('utm_medium'),
		utmCampaign: text('utm_campaign'),
		utmTerm: text('utm_term'),
		utmContent: text('utm_content'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('utm_templates_workspaceId_idx').on(table.workspaceId)]
);

export const linksRelations = relations(links, ({ one }) => ({
	workspace: one(organization, {
		fields: [links.workspaceId],
		references: [organization.id]
	}),
	domain: one(domains, {
		fields: [links.domainId],
		references: [domains.id]
	})
}));

export const domainsRelations = relations(domains, ({ one, many }) => ({
	workspace: one(organization, {
		fields: [domains.workspaceId],
		references: [organization.id]
	}),
	links: many(links)
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
	workspace: one(organization, {
		fields: [apiKeys.workspaceId],
		references: [organization.id]
	})
}));

export const utmTemplatesRelations = relations(utmTemplates, ({ one }) => ({
	workspace: one(organization, {
		fields: [utmTemplates.workspaceId],
		references: [organization.id]
	})
}));

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type Domain = typeof domains.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type UtmTemplate = typeof utmTemplates.$inferSelect;
