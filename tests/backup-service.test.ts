import { describe, it, expect } from 'bun:test';
import { AVAILABLE_DATASETS, filterValidDatasets, exportDatasets } from '../src/lib/server/backup-service';

describe('Backup & Restore Service Logic', () => {
	it('should list all supported datasets', () => {
		expect(AVAILABLE_DATASETS).toContain('links');
		expect(AVAILABLE_DATASETS).toContain('domains');
		expect(AVAILABLE_DATASETS).toContain('utmTemplates');
		expect(AVAILABLE_DATASETS).toContain('webhooks');
		expect(AVAILABLE_DATASETS).toContain('siteSettings');
		expect(AVAILABLE_DATASETS).toContain('inviteCodes');
	});

	it('should filter out unknown or invalid datasets', () => {
		const filtered = filterValidDatasets(['links', 'hack_table', 'domains', '']);
		expect(filtered).toEqual(['links', 'domains']);
	});

	it('should export selected datasets without errors', async () => {
		const exportRes = await exportDatasets(['siteSettings', 'inviteCodes']);
		expect(exportRes.version).toBe(1);
		expect(exportRes.datasets.siteSettings).toBeDefined();
		expect(exportRes.datasets.inviteCodes).toBeDefined();
		expect(exportRes.datasets.links).toBeUndefined();
	});
});
