CREATE TABLE `invite_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`creator_id` text,
	`max_uses` integer DEFAULT 1 NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`expires_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_codes_code_unique` ON `invite_codes` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `invite_codes_code_idx` ON `invite_codes` (`code`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`secret` text,
	`events` text DEFAULT '["link.clicked"]' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_discord` integer DEFAULT false NOT NULL,
	`discord_config` text,
	`last_triggered_at` integer,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhooks_workspaceId_idx` ON `webhooks` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'member' NOT NULL;