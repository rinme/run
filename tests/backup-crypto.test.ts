import { describe, it, expect } from 'bun:test';
import { encryptBackup, decryptBackup } from '../src/lib/server/backup-crypto';

describe('Backup Cryptography Engine (AES-256-GCM)', () => {
	const sampleData = {
		version: 1,
		createdAt: '2026-10-24T20:00:00.000Z',
		datasets: {
			links: [{ id: 'link_1', slug: 'promo', destinationUrl: 'https://example.com' }],
			siteSettings: [{ key: 'general', value: { siteTitle: 'Run Test' } }]
		}
	};

	it('should return plain JSON when no passphrase is provided', async () => {
		const result = await encryptBackup(sampleData);
		const parsed = JSON.parse(result);
		expect(parsed.encrypted).toBe(false);
		expect(parsed.datasets.links[0].slug).toBe('promo');

		const decrypted = await decryptBackup(result);
		expect(decrypted.datasets.links[0].slug).toBe('promo');
	});

	it('should correctly encrypt and decrypt with a passphrase', async () => {
		const passphrase = 'SuperSecretBackupPassword123!';
		const encryptedStr = await encryptBackup(sampleData, passphrase);
		const parsedEnvelope = JSON.parse(encryptedStr);

		expect(parsedEnvelope.encrypted).toBe(true);
		expect(parsedEnvelope.algorithm).toBe('AES-256-GCM');
		expect(typeof parsedEnvelope.salt).toBe('string');
		expect(typeof parsedEnvelope.iv).toBe('string');
		expect(typeof parsedEnvelope.ciphertext).toBe('string');
		// Sensitive data must not appear in plaintext in the encrypted string
		expect(encryptedStr.includes('https://example.com')).toBe(false);

		const restored = await decryptBackup(encryptedStr, passphrase);
		expect(restored.version).toBe(1);
		expect(restored.datasets.links[0].destinationUrl).toBe('https://example.com');
		expect(restored.datasets.siteSettings[0].value.siteTitle).toBe('Run Test');
	});

	it('should throw an error when decrypting with an incorrect passphrase', async () => {
		const passphrase = 'CorrectPassword999';
		const encryptedStr = await encryptBackup(sampleData, passphrase);

		expect(async () => {
			await decryptBackup(encryptedStr, 'WrongPassword123');
		}).toThrow();
	});

	it('should throw an error when decrypting encrypted data with no passphrase', async () => {
		const encryptedStr = await encryptBackup(sampleData, 'SomePassphrase');
		expect(async () => {
			await decryptBackup(encryptedStr, '');
		}).toThrow();
	});
});
