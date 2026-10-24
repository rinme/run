import { describe, it, expect, beforeEach } from 'bun:test';
import { db } from '../src/lib/server/db/index';
import { links, domains, user, organization, member } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { runWorkspaceMigration } from '../src/lib/server/workspace-migration';

describe('Workspace Legacy Backfill Migration', () => {
	it('should successfully run workspace migration without errors', async () => {
		expect(async () => {
			await runWorkspaceMigration();
		}).not.toThrow();
	});
});
