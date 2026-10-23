import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSiteSetting, DEFAULT_FEATURES_CONFIG, type SiteFeaturesConfig } from '#lib/server/settings.ts';

interface CachedReleaseData {
	repo: string;
	timestamp: number;
	data: any[];
}

let memoryCache: CachedReleaseData | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const FALLBACK_RELEASES = [
	{
		id: 1,
		tag_name: 'v1.2.0',
		name: 'v1.2.0: Invite-Only Registration, Admin Control & Discord Webhooks',
		published_at: new Date().toISOString(),
		html_url: 'https://github.com/rinme/run/releases',
		prerelease: false,
		body: `### Highlights\n- **VIP Invite-Only Access**: Dual-mode registration system via cryptographically generated invite codes (\`RUN-VIP-XXXX\`) and direct email invitations.\n- **Admin System Control Dashboard**: Complete governance over instance metadata, registration policies, email transport (SMTP/Resend), and session revocation.\n- **Global Session Manager**: Real-time cross-user active bearer token inspection and 1-click revocation.\n- **Outgoing Webhooks Engine**: Real-time event streams (\`link.clicked\`, \`link.created\`, \`security.blocked\`) with automatic Discord webhook detection and rich embed customization.\n- **Stability Safeguards**: Exponential backoff and tab visibility checks for telemetry streams.`
	},
	{
		id: 2,
		tag_name: 'v1.1.0',
		name: 'v1.1.0: 6 Delivery Modes, 3D WebGL Globe & In-Place Link Drawer',
		published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
		html_url: 'https://github.com/rinme/run/releases',
		prerelease: false,
		body: `### Highlights\n- **6 High-Speed Delivery Modes**: Direct 302, PBKDF2 Password Challenge, HMAC-SHA256 Age Gate, Countdown Interstitial, Cloaked Iframe, and Reverse Proxy.\n- **Interactive 3D WebGL Globe**: Real-time rotating sphere with coordinate click arcs and country density highlights.\n- **Slide-Over Link Drawer**: Seamless tabbed editing (General, Delivery, Routing, UTM, Social) with live OpenGraph preview card.\n- **QR Code Studio**: Full styling engine with corner square styling and SVG/PNG exports.`
	},
	{
		id: 3,
		tag_name: 'v1.0.0',
		name: 'v1.0.0: Initial Edge Release & Native MCP Server',
		published_at: new Date(Date.now() - 86400000 * 5).toISOString(),
		html_url: 'https://github.com/rinme/run/releases',
		prerelease: false,
		body: `### Highlights\n- **Edge Routing & KV Cache**: Write-through cache architecture with sub-10ms link resolution.\n- **Model Context Protocol (MCP)**: Native JSON-RPC endpoint at \`/api/mcp\` exposing AI tools for agentic link automation.\n- **OpenAPI 3.1 Specification**: Available at \`/api/openapi.json\`.`
	}
];

export const GET: RequestHandler = async () => {
	const features = await getSiteSetting<SiteFeaturesConfig>('features', DEFAULT_FEATURES_CONFIG);
	const targetRepo = features.changelogRepo?.trim() || 'rinme/run';

	const now = Date.now();
	if (memoryCache && memoryCache.repo === targetRepo && now - memoryCache.timestamp < CACHE_TTL_MS) {
		return json({
			repo: targetRepo,
			cached: true,
			releases: memoryCache.data
		});
	}

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		const res = await fetch(`https://api.github.com/repos/${targetRepo}/releases?per_page=20`, {
			headers: {
				'User-Agent': 'Run-Link-Engine/1.0',
				Accept: 'application/vnd.github.v3+json'
			},
			signal: controller.signal
		});

		clearTimeout(timeout);

		if (res.ok) {
			const releases = await res.json();
			if (Array.isArray(releases) && releases.length > 0) {
				memoryCache = {
					repo: targetRepo,
					timestamp: now,
					data: releases
				};
				return json({
					repo: targetRepo,
					cached: false,
					releases
				});
			}
		}
	} catch (err) {
		console.warn('Failed to fetch GitHub releases, falling back:', err);
	}

	// Fallback when offline or rate-limited
	return json({
		repo: targetRepo,
		fallback: true,
		releases: FALLBACK_RELEASES
	});
};
