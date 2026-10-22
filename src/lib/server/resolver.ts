import { db } from './db';
import { links, domains, type Link, type Domain } from './db/schema';
import { linkCache } from './cache';
import { parseClientMetadata, trackClickEvent } from './analytics';
import { verifyPassword, verifyAgeToken } from './security';
import { eq, and, isNull } from 'drizzle-orm';

export const RESERVED_PATHS = new Set([
	'api',
	'dashboard',
	'login',
	'demo',
	'favicon.ico',
	'robots.txt',
	'sitemap.xml',
	'_app',
	'admin',
	'auth'
]);

export interface ResolutionResult {
	type: 'redirect' | 'response' | 'pass';
	status?: number;
	location?: string;
	response?: Response;
}

export async function resolveShortLink(
	request: Request,
	url: URL
): Promise<ResolutionResult> {
	const pathname = url.pathname;
	const parts = pathname.slice(1).split('/');
	const slug = parts[0];

	if (!slug || RESERVED_PATHS.has(slug.toLowerCase())) {
		return { type: 'pass' };
	}

	const host = request.headers.get('host')?.split(':')[0].toLowerCase() || '';

	// 1. Check KV / Memory Cache
	let linkData = await linkCache.get(host, slug);
	let link: Link | null = linkData?.link ?? null;
	let domain: Domain | null = linkData?.domain ?? null;

	// 2. Cache miss -> query DB
	if (!link) {
		// Look up custom domain first
		const matchedDomains = await db
			.select()
			.from(domains)
			.where(eq(domains.name, host))
			.limit(1);

		domain = matchedDomains[0] ?? null;

		const matchedLinks = domain
			? await db
					.select()
					.from(links)
					.where(and(eq(links.slug, slug), eq(links.domainId, domain.id)))
					.limit(1)
			: await db
					.select()
					.from(links)
					.where(and(eq(links.slug, slug), isNull(links.domainId)))
					.limit(1);

		link = matchedLinks[0] ?? null;

		if (link) {
			await linkCache.set(host, slug, { link, domain });
		}
	}

	// 3. Not found handling
	if (!link) {
		if (domain?.fallbackUrl) {
			return { type: 'redirect', status: 302, location: domain.fallbackUrl };
		}
		return { type: 'pass' };
	}

	// 4. Archive / Expiration / Click Limit Checks
	if (link.isArchived) {
		return { type: 'pass' };
	}

	const now = Date.now();
	const isExpiredByTime = link.expiresAt && link.expiresAt.getTime() < now;
	const isExpiredByClicks =
		link.maxClicks !== null &&
		link.maxClicks !== undefined &&
		link.currentClicks >= link.maxClicks;

	if (isExpiredByTime || isExpiredByClicks) {
		if (link.expiredRedirectUrl) {
			return { type: 'redirect', status: 302, location: link.expiredRedirectUrl };
		}
		return {
			type: 'response',
			response: new Response(
				renderExpiredPage(link.slug, isExpiredByTime ? 'This link has expired.' : 'Click limit reached for this link.'),
				{ status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
			)
		};
	}

	// 5. Client Metadata & Dynamic Routing
	const meta = parseClientMetadata(request);
	let targetUrl = link.destinationUrl;

	// Device Routing
	if (link.deviceRouting) {
		try {
			const devRules = JSON.parse(link.deviceRouting) as { ios?: string; android?: string };
			const ua = request.headers.get('user-agent')?.toLowerCase() || '';
			if (devRules.ios && (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod'))) {
				targetUrl = devRules.ios;
			} else if (devRules.android && ua.includes('android')) {
				targetUrl = devRules.android;
			}
		} catch (e) {
			console.error('Error parsing deviceRouting:', e);
		}
	}

	// Geo Routing
	if (link.geoRouting && meta.country !== 'XX') {
		try {
			const geoRules = JSON.parse(link.geoRouting) as Record<string, string>;
			if (geoRules[meta.country]) {
				targetUrl = geoRules[meta.country];
			}
		} catch (e) {
			console.error('Error parsing geoRouting:', e);
		}
	}

	// A/B Split Testing
	if (link.abSplits) {
		try {
			const splits = JSON.parse(link.abSplits) as Array<{ url: string; weight: number }>;
			if (Array.isArray(splits) && splits.length > 0) {
				const totalWeight = splits.reduce((acc, curr) => acc + (curr.weight || 0), 0);
				if (totalWeight > 0) {
					let random = Math.random() * totalWeight;
					for (const split of splits) {
						if (random < split.weight) {
							targetUrl = split.url;
							break;
						}
						random -= split.weight;
					}
				}
			}
		} catch (e) {
			console.error('Error parsing abSplits:', e);
		}
	}

	// Forward Query Params & UTM Presets
	const finalTarget = new URL(targetUrl);

	// UTM Presets
	if (link.utmPreset) {
		try {
			const utm = JSON.parse(link.utmPreset) as Record<string, string>;
			if (utm.source && !finalTarget.searchParams.has('utm_source')) finalTarget.searchParams.set('utm_source', utm.source);
			if (utm.medium && !finalTarget.searchParams.has('utm_medium')) finalTarget.searchParams.set('utm_medium', utm.medium);
			if (utm.campaign && !finalTarget.searchParams.has('utm_campaign')) finalTarget.searchParams.set('utm_campaign', utm.campaign);
			if (utm.term && !finalTarget.searchParams.has('utm_term')) finalTarget.searchParams.set('utm_term', utm.term);
			if (utm.content && !finalTarget.searchParams.has('utm_content')) finalTarget.searchParams.set('utm_content', utm.content);
		} catch (e) {
			console.error('Error parsing utmPreset:', e);
		}
	}

	// Forward searchParams if redirectWithQuery is true
	if (link.redirectWithQuery) {
		url.searchParams.forEach((value, key) => {
			if (key !== '_verified' && key !== '_pwd') {
				finalTarget.searchParams.set(key, value);
			}
		});
	}

	const finalTargetUrl = finalTarget.toString();

	// Asynchronously record click event without delaying redirect
	trackClickEvent({
		timestamp: new Date().toISOString(),
		linkId: link.id,
		slug: link.slug,
		destinationUrl: finalTargetUrl,
		workspaceId: link.workspaceId,
		domain: host,
		country: meta.country,
		city: meta.city,
		deviceType: meta.deviceType,
		browser: meta.browser,
		os: meta.os,
		referer: meta.referer,
		ip: meta.ip
	}).catch((err) => console.error('Track click error:', err));

	// 6. Security Gates & Delivery Modes
	switch (link.deliveryMode) {
		case 'password': {
			const submittedPwd = url.searchParams.get('_pwd') || '';
			const isAuthorized = submittedPwd
				? await verifyPassword(submittedPwd, link.passwordHash || '')
				: false;

			if (!isAuthorized) {
				return {
					type: 'response',
					response: new Response(
						renderPasswordGatePage(link.slug, url.search, link.title || 'Protected Link'),
						{ status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
					)
				};
			}
			return { type: 'redirect', status: 302, location: finalTargetUrl };
		}

		case 'age_gate': {
			const token = url.searchParams.get('_verified') || '';
			const isVerified = await verifyAgeToken(link.slug, token);
			if (!isVerified) {
				return {
					type: 'response',
					response: new Response(
						renderAgeGatePage(link.slug, url.search, link.title || 'Age Restricted Content'),
						{ status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
					)
				};
			}
			return { type: 'redirect', status: 302, location: finalTargetUrl };
		}

		case 'interstitial': {
			return {
				type: 'response',
				response: new Response(
					renderInterstitialPage(
						finalTargetUrl,
						link.interstitialDuration || 5,
						link.title || 'Redirecting...'
					),
					{ status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
				)
			};
		}

		case 'cloaked': {
			return {
				type: 'response',
				response: new Response(
					renderCloakedPage(finalTargetUrl, link.title || 'Run Link'),
					{ status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
				)
			};
		}

		case 'reverse_proxy': {
			return {
				type: 'response',
				response: await handleReverseProxy(request, finalTargetUrl)
			};
		}

		case 'direct':
		default:
			return { type: 'redirect', status: 302, location: finalTargetUrl };
	}
}

async function handleReverseProxy(request: Request, targetUrl: string): Promise<Response> {
	const headers = new Headers(request.headers);
	headers.delete('host');
	headers.delete('connection');
	headers.delete('keep-alive');
	headers.delete('proxy-authenticate');
	headers.delete('proxy-authorization');
	headers.delete('te');
	headers.delete('trailer');
	headers.delete('transfer-encoding');
	headers.delete('upgrade');

	const clientIp =
		request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
		request.headers.get('x-real-ip') ||
		'127.0.0.1';
	headers.set('x-forwarded-for', clientIp);

	try {
		const upstreamResponse = await fetch(targetUrl, {
			method: request.method,
			headers,
			body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
			redirect: 'follow'
		});

		const responseHeaders = new Headers(upstreamResponse.headers);
		responseHeaders.delete('content-encoding');
		responseHeaders.delete('transfer-encoding');

		return new Response(upstreamResponse.body, {
			status: upstreamResponse.status,
			statusText: upstreamResponse.statusText,
			headers: responseHeaders
		});
	} catch (e) {
		console.error('Reverse proxy fetch error:', e);
		return new Response('Reverse proxy destination unreachable', { status: 502 });
	}
}

// ----------------- HTML Templates for Delivery Modes -----------------

function renderPasswordGatePage(slug: string, queryString: string, title: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Protected | ${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 0.875rem; color: #a1a1aa; margin-bottom: 24px; }
    input[type="password"] { width: 100%; box-sizing: border-box; background: #09090b; border: 1px solid #27272a; color: #fff; padding: 12px 14px; border-radius: 8px; font-size: 1rem; margin-bottom: 16px; outline: none; }
    input[type="password"]:focus { border-color: #3b82f6; }
    button { width: 100%; background: #3b82f6; color: #fff; font-weight: 500; padding: 12px; border: none; border-radius: 8px; font-size: 0.95rem; cursor: pointer; transition: background 0.15s; }
    button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Password Protected</h1>
    <p>This link is protected. Enter the password to continue.</p>
    <form method="GET" action="/${encodeURIComponent(slug)}">
      <input type="password" name="_pwd" placeholder="Enter password..." required autofocus />
      <button type="submit">Unlock & Continue &rarr;</button>
    </form>
  </div>
</body>
</html>`;
}

function renderAgeGatePage(slug: string, queryString: string, title: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Age Verification | ${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; width: 100%; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; }
    .badge { display: inline-block; background: #ef4444; color: #fff; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; letter-spacing: 0.05em; }
    h1 { font-size: 1.35rem; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 0.875rem; color: #a1a1aa; margin-bottom: 24px; line-height: 1.5; }
    .btn-row { display: flex; gap: 12px; }
    button { flex: 1; padding: 12px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; border: none; }
    .confirm { background: #3b82f6; color: #fff; }
    .confirm:hover { background: #2563eb; }
    .decline { background: #27272a; color: #a1a1aa; }
    .decline:hover { background: #3f3f46; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">18+ RESTRICTED</div>
    <h1>Age Verification Required</h1>
    <p>This destination contains adult or age-restricted content. Please confirm that you are at least 18 years of age or older.</p>
    <div class="btn-row">
      <button class="decline" onclick="window.history.back()">Exit</button>
      <button class="confirm" id="confirmBtn">I am 18 or older</button>
    </div>
  </div>
  <script>
    document.getElementById('confirmBtn').addEventListener('click', async () => {
      const res = await fetch('/api/verify-age?slug=' + encodeURIComponent('${slug}'));
      if (res.ok) {
        const data = await res.json();
        const url = new URL(window.location.href);
        url.searchParams.set('_verified', data.token);
        window.location.href = url.toString();
      }
    });
  </script>
</body>
</html>`;
}

function renderInterstitialPage(destinationUrl: string, seconds: number, title: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="${seconds};url=${escapeHtml(destinationUrl)}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 36px; width: 100%; max-width: 440px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .timer { font-size: 3rem; font-weight: 800; color: #3b82f6; margin: 16px 0; }
    p { font-size: 0.95rem; color: #a1a1aa; margin-bottom: 24px; }
    a { color: #60a5fa; text-decoration: none; font-size: 0.875rem; word-break: break-all; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin: 0 0 8px 0; font-size: 1.25rem;">Redirecting to destination</h2>
    <p>Please wait a moment while we take you to your link.</p>
    <div class="timer" id="countdown">${seconds}</div>
    <a href="${escapeHtml(destinationUrl)}">Click here if you are not redirected automatically &rarr;</a>
  </div>
  <script>
    let remaining = ${seconds};
    const el = document.getElementById('countdown');
    const interval = setInterval(() => {
      remaining -= 1;
      if (el) el.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(interval);
        window.location.href = ${JSON.stringify(destinationUrl)};
      }
    }, 1000);
  </script>
</body>
</html>`;
}

function renderCloakedPage(destinationUrl: string, title: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    iframe { width: 100vw; height: 100vh; border: none; display: block; }
  </style>
</head>
<body>
  <iframe src="${escapeHtml(destinationUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</body>
</html>`;
}

function renderExpiredPage(slug: string, reason: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Link Inactive | Run</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 36px; width: 100%; max-width: 400px; text-align: center; }
    h1 { font-size: 1.35rem; color: #ef4444; margin: 0 0 12px 0; }
    p { font-size: 0.9rem; color: #a1a1aa; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Link Inactive</h1>
    <p>${escapeHtml(reason)}</p>
    <p style="margin-top: 16px; font-size: 0.8rem; color: #71717a;">Powered by Run</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
