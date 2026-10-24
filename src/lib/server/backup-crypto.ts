import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';

/**
 * AES-256-GCM Backup Encryption & Decryption Engine
 *
 * Provides cryptographic protection for database exports using PBKDF2 key derivation
 * and AES-256-GCM authenticated encryption with auth-tag verification.
 */

export interface BackupEnvelope {
	version: number;
	encrypted: boolean;
	algorithm?: 'AES-256-GCM';
	salt?: string; // Base64 encoded PBKDF2 salt (16 bytes)
	iv?: string; // Base64 encoded AES-GCM IV (12 bytes)
	tag?: string; // Base64 encoded GCM Auth Tag (16 bytes)
	ciphertext?: string; // Base64 encoded ciphertext
	datasets?: Record<string, any[]>;
	exportedAt?: string;
	stats?: Record<string, number>;
}

const PBKDF2_ITERATIONS = 100_000;
const KEY_BYTES = 32; // 256 bits
const SALT_BYTES = 16;
const IV_BYTES = 12;

function deriveKey(passphrase: string, salt: Buffer): Buffer {
	return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_BYTES, 'sha256');
}

/**
 * Encrypts data with AES-256-GCM if passphrase is provided; otherwise returns unencrypted envelope.
 */
export async function encryptBackup(data: unknown, passphrase?: string): Promise<string> {
	const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);

	if (!passphrase || passphrase.trim() === '') {
		let parsed: any;
		try {
			parsed = JSON.parse(jsonStr);
		} catch {
			parsed = { data };
		}
		const envelope: BackupEnvelope = {
			version: 1,
			encrypted: false,
			...parsed
		};
		return JSON.stringify(envelope, null, 2);
	}

	const salt = randomBytes(SALT_BYTES);
	const iv = randomBytes(IV_BYTES);
	const key = deriveKey(passphrase, salt);

	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const ciphertext = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();

	const envelope: BackupEnvelope = {
		version: 1,
		encrypted: true,
		algorithm: 'AES-256-GCM',
		salt: salt.toString('base64'),
		iv: iv.toString('base64'),
		tag: tag.toString('base64'),
		ciphertext: ciphertext.toString('base64')
	};

	return JSON.stringify(envelope, null, 2);
}

/**
 * Decrypts a backup envelope string. If not encrypted, parses and returns the underlying data.
 * Throws an error if passphrase is required but missing, or if decryption authentication fails.
 */
export async function decryptBackup(envelopeStr: string, passphrase?: string): Promise<any> {
	let envelope: BackupEnvelope;
	try {
		envelope = typeof envelopeStr === 'string' ? JSON.parse(envelopeStr) : envelopeStr;
	} catch (err: any) {
		throw new Error(`Failed to parse backup JSON: ${err.message}`);
	}

	// If not encrypted, return as-is
	if (!envelope.encrypted) {
		return envelope;
	}

	if (!passphrase || passphrase.trim() === '') {
		throw new Error('This backup is encrypted with AES-256-GCM. A password is required to decrypt it.');
	}

	if (!envelope.salt || !envelope.iv || !envelope.ciphertext) {
		throw new Error('Corrupted or invalid encrypted backup envelope structure.');
	}

	const salt = Buffer.from(envelope.salt, 'base64');
	const iv = Buffer.from(envelope.iv, 'base64');
	const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
	const tag = envelope.tag ? Buffer.from(envelope.tag, 'base64') : Buffer.alloc(0);

	const key = deriveKey(passphrase, salt);

	try {
		const decipher = createDecipheriv('aes-256-gcm', key, iv);
		if (tag.length > 0) {
			decipher.setAuthTag(tag);
		}

		const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
		return JSON.parse(decrypted.toString('utf8'));
	} catch (err) {
		throw new Error('Decryption failed: Invalid password or corrupted backup file.');
	}
}
