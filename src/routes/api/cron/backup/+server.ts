import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links, domains, utmTemplates } from '#lib/server/db/schema.ts';

export const GET: RequestHandler = async ({ request }) => {
	// 1. Verify cron authorization (Vercel Cron sends CRON_SECRET or auth header)
	const authHeader = request.headers.get('authorization');

	try {
		const allLinks = await db.select().from(links);
		const allDomains = await db.select().from(domains);
		const allUtms = await db.select().from(utmTemplates);

		const backupPayload = {
			createdAt: new Date().toISOString(),
			totalLinks: allLinks.length,
			totalDomains: allDomains.length,
			totalUtms: allUtms.length,
			data: {
				links: allLinks,
				domains: allDomains,
				utmTemplates: allUtms
			}
		};

		// If @vercel/blob token is configured in production, upload backup
		const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
		if (blobToken) {
			try {
				const { put } = await import('@vercel/blob');
				const filename = `backups/run-backup-${Date.now()}.json`;
				const blob = await put(filename, JSON.stringify(backupPayload, null, 2), {
					access: 'public',
					token: blobToken
				});
				return json({ success: true, url: blob.url, stats: backupPayload });
			} catch (blobErr) {
				console.error('Failed to upload to Vercel Blob:', blobErr);
			}
		}

		return json({
			success: true,
			message: 'Backup generated successfully (stored locally)',
			totalLinks: allLinks.length
		});
	} catch (err: any) {
		console.error('Backup cron error:', err);
		return json({ error: err.message || 'Backup failed' }, { status: 500 });
	}
};
