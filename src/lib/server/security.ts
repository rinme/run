let secretSalt = process.env.SITE_TOKEN || 'run-default-fallback-secret-2026';

try {
	const privateEnv = await import('$app/env/private');
	if (privateEnv.SITE_TOKEN) secretSalt = privateEnv.SITE_TOKEN;
} catch {}

/**
 * PBKDF2 Web Crypto password hashing (100,000 iterations)
 */
export async function hashPassword(password: string): Promise<string> {
	const enc = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		enc.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveBits']
	);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: 100000,
			hash: 'SHA-256'
		},
		keyMaterial,
		256
	);

	const saltHex = Array.from(salt)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	const hashHex = Array.from(new Uint8Array(derivedBits))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	if (!storedHash || !storedHash.includes(':')) return false;
	const [saltHex, expectedHashHex] = storedHash.split(':');
	if (!saltHex || !expectedHashHex) return false;

	const salt = new Uint8Array(
		saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
	);

	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		enc.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveBits']
	);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: 100000,
			hash: 'SHA-256'
		},
		keyMaterial,
		256
	);

	const actualHashHex = Array.from(new Uint8Array(derivedBits))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return actualHashHex === expectedHashHex;
}

/**
 * HMAC-SHA256 for NSFW age verification token issuance & validation
 */
export async function generateAgeToken(slug: string): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secretSalt),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign('HMAC', key, enc.encode(`run-age-gate:${slug}`));
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function verifyAgeToken(slug: string, token: string): Promise<boolean> {
	if (!token) return false;
	const expected = await generateAgeToken(slug);
	return expected === token;
}
