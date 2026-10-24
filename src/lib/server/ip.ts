/**
 * Client IP Resolution & Forwarded Headers Helper
 *
 * Reliably resolves the client's real IP address across CDNs (Cloudflare, Vercel),
 * reverse proxies (Nginx, Traefik, Caddy), and cloud environments.
 */

export interface RequestEventLike {
	request: Request;
	getClientAddress?: () => string;
}

/**
 * Resolves the true client IP address from standard and vendor headers
 */
export function getClientIp(event: RequestEventLike): string {
	const req = event.request;

	// 1. Cloudflare True Client / Connecting IP
	const cfConnectingIp = req.headers.get('cf-connecting-ip');
	if (cfConnectingIp && cfConnectingIp.trim() !== '') {
		return cfConnectingIp.trim();
	}

	const trueClientIp = req.headers.get('true-client-ip');
	if (trueClientIp && trueClientIp.trim() !== '') {
		return trueClientIp.trim();
	}

	// 2. Vercel Forwarded IP
	const vercelIp = req.headers.get('x-vercel-forwarded-for');
	if (vercelIp && vercelIp.trim() !== '') {
		const first = vercelIp.split(',')[0].trim();
		if (first) return first;
	}

	// 3. Standard X-Forwarded-For (first IP is the initial client)
	const xff = req.headers.get('x-forwarded-for');
	if (xff && xff.trim() !== '') {
		const first = xff.split(',')[0].trim();
		if (first) return first;
	}

	// 4. X-Real-IP (Nginx, Caddy)
	const realIp = req.headers.get('x-real-ip');
	if (realIp && realIp.trim() !== '') {
		return realIp.trim();
	}

	// 5. SvelteKit platform adapter
	if (typeof event.getClientAddress === 'function') {
		try {
			const addr = event.getClientAddress();
			if (addr && addr.trim() !== '') {
				return addr.trim();
			}
		} catch {}
	}

	return '127.0.0.1';
}

/**
 * Clones and enriches request headers with resolved client IP address
 * for passing to Better Auth, internal API handlers, or proxy services.
 */
export function createForwardedHeaders(event: RequestEventLike): Headers {
	const headers = new Headers(event.request.headers);
	const clientIp = getClientIp(event);

	if (clientIp) {
		headers.set('x-forwarded-for', clientIp);
		headers.set('x-real-ip', clientIp);
	}

	return headers;
}
