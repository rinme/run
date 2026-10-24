import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { exportDatasets } from '#lib/server/backup-service.ts';
import { encryptBackup } from '#lib/server/backup-crypto.ts';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Guard: Admin only
	if (!locals.user?.id) {
		return json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
	}

	const currentUser = await db.select().from(user).where(eq(user.id, locals.user.id)).get();
	if (!currentUser || currentUser.role !== 'admin') {
		return json({ error: 'Forbidden: Super Administrator privileges required' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const datasets = Array.isArray(body.datasets) ? body.datasets : undefined;
		const passphrase = typeof body.passphrase === 'string' ? body.passphrase.trim() : undefined;

		const exportedPayload = await exportDatasets(datasets);
		const resultString = await encryptBackup(exportedPayload, passphrase);

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		const filename = passphrase
			? `run-backup-encrypted-${timestamp}.runbackup.json`
			: `run-backup-${timestamp}.json`;

		return new Response(resultString, {
			status: 200,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (err: any) {
		console.error('Backup export failed:', err);
		return json({ error: err.message || 'Export failed' }, { status: 500 });
	}
};
