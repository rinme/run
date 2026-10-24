import { describe, it, expect } from 'bun:test';
import { generateInviteEmailHtml } from '../src/lib/server/email';

describe('Invitation Email Generator', () => {
	it('should generate responsive HTML email with invite code and CTA button', () => {
		const html = generateInviteEmailHtml({
			code: 'RUN-VIP-TEST123',
			appName: 'Run',
			origin: 'https://run.app',
			role: 'trusted',
			maxUses: 1
		});

		expect(html).toContain('RUN-VIP-TEST123');
		expect(html).toContain('https://run.app/login?code=RUN-VIP-TEST123');
		expect(html).toContain('Accept Invitation & Register');
		expect(html).toContain('Run');
		expect(html).toContain('Trusted');
	});
});
