import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { restoreDatasets } from '#lib/server/backup-service.ts';
import { decryptBackup } from '#lib/server/backup-crypto.ts';

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
		let backupContent = '';
		let passphrase = '';
		let overwrite = true;

		const contentType = request.headers.get('content-type') || '';

		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			const file = formData.get('file');
			if (!file || typeof file === 'string') {
				return json({ error: 'No backup file provided in upload' }, { status: 400 });
			}
			backupContent = await (file as File).text();
			passphrase = formData.get('passphrase')?.toString().trim() || '';
			overwrite = formData.get('overwrite') !== 'false';
		} else {
			const body = await request.json();
			backupContent = typeof body.backupData === 'string' ? body.backupData : JSON.stringify(body.backupData);
			passphrase = typeof body.passphrase === 'string' ? body.passphrase.trim() : '';
			overwrite = body.overwrite !== false;
		}

		if (!backupContent || backupContent.trim() === '') {
			return json({ error: 'Empty backup data' }, { status: 400 });
		}

		// 2. Decrypt if encrypted, or parse plain JSON
		const decryptedPayload = await decryptBackup(backupContent, passphrase);

		const datasets = decryptedPayload.datasets || decryptedPayload.data;
		if (!datasets || typeof datasets !== 'object') {
			return json({ error: 'Invalid backup structure: No valid datasets found' }, { status: 400 });
		}

		// 3. Perform restoration
		const restoreResult = await restoreDatasets(datasets, { overwrite });

		return json({
			success: restoreResult.success,
			stats: restoreResult.stats,
			errors: restoreResult.errors
		});
	} catch (err: any) {
		console.error('Backup restore failed:', err);
		return json({ error: err.message || 'Restoration failed' }, { status: 400 });
	}
};
