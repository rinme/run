import { db } from './db/index';
import { links, domains, user, organization, member } from './db/schema';
import { eq, or, sql } from 'drizzle-orm';
import { ensurePersonalWorkspace } from './workspaces';

let migrationRan = false;

/**
 * Automatically backfills legacy 'default-workspace' links & domains
 * into the primary administrator's personal workspace.
 */
export async function runWorkspaceMigration() {
	if (migrationRan) return;
	migrationRan = true;

	try {
		// 1. Check if any links or domains are on default-workspace
		const [orphanedLink] = await db
			.select({ id: links.id })
			.from(links)
			.where(eq(links.workspaceId, 'default-workspace'))
			.limit(1);

		const [orphanedDomain] = await db
			.select({ id: domains.id })
			.from(domains)
			.where(eq(domains.workspaceId, 'default-workspace'))
			.limit(1);

		if (!orphanedLink && !orphanedDomain) {
			return;
		}

		// 2. Find primary admin user or first user
		const [adminUser] = await db
			.select({ id: user.id, name: user.name, email: user.email })
			.from(user)
			.where(eq(user.role, 'admin'))
			.limit(1);

		const targetUser = adminUser || (await db.select({ id: user.id, name: user.name, email: user.email }).from(user).limit(1))[0];

		if (!targetUser) {
			return;
		}

		// 3. Ensure target user has personal workspace
		const personalWorkspace = await ensurePersonalWorkspace(targetUser.id, targetUser.name || targetUser.email);

		// 4. Migrate links
		const migratedLinks = await db
			.update(links)
			.set({ workspaceId: personalWorkspace.id })
			.where(eq(links.workspaceId, 'default-workspace'))
			.returning({ id: links.id });

		// 5. Migrate domains
		const migratedDomains = await db
			.update(domains)
			.set({ workspaceId: personalWorkspace.id })
			.where(eq(domains.workspaceId, 'default-workspace'))
			.returning({ id: domains.id });

		console.log(
			`[Workspace Migration] Assigned ${migratedLinks.length} legacy links and ${migratedDomains.length} domains to ${targetUser.email}'s personal workspace (${personalWorkspace.id}).`
		);
	} catch (err) {
		console.error('[Workspace Migration] Failed to run migration:', err);
	}
}
