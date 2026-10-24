import { describe, it, expect } from 'bun:test';
import { getClientIp, createForwardedHeaders } from '../src/lib/server/ip';

describe('Client IP Resolution', () => {
	it('should extract cf-connecting-ip as highest priority', () => {
		const request = new Request('https://run.link', {
			headers: {
				'cf-connecting-ip': '203.0.113.195',
				'x-forwarded-for': '198.51.100.1, 192.0.2.1',
				'x-real-ip': '192.0.2.1'
			}
		});

		expect(getClientIp({ request })).toBe('203.0.113.195');
	});

	it('should extract first IP from x-vercel-forwarded-for', () => {
		const request = new Request('https://run.link', {
			headers: {
				'x-vercel-forwarded-for': '198.51.100.22, 10.0.0.1'
			}
		});

		expect(getClientIp({ request })).toBe('198.51.100.22');
	});

	it('should extract first IP from x-forwarded-for when multi-hop proxy', () => {
		const request = new Request('https://run.link', {
			headers: {
				'x-forwarded-for': '203.0.113.44, 70.42.1.2'
			}
		});

		expect(getClientIp({ request })).toBe('203.0.113.44');
	});

	it('should fall back to getClientAddress() if available', () => {
		const request = new Request('https://run.link');
		const ip = getClientIp({
			request,
			getClientAddress: () => '192.0.2.55'
		});

		expect(ip).toBe('192.0.2.55');
	});

	it('should fallback to 127.0.0.1 if no headers or adapter IP available', () => {
		const request = new Request('https://run.link');
		expect(getClientIp({ request })).toBe('127.0.0.1');
	});

	it('should create forwarded headers populated with client IP and user agent', () => {
		const request = new Request('https://run.link', {
			headers: {
				'cf-connecting-ip': '198.51.100.99',
				'user-agent': 'Mozilla/5.0 TestBrowser'
			}
		});

		const headers = createForwardedHeaders({ request });
		expect(headers.get('x-forwarded-for')).toBe('198.51.100.99');
		expect(headers.get('x-real-ip')).toBe('198.51.100.99');
		expect(headers.get('user-agent')).toBe('Mozilla/5.0 TestBrowser');
	});
});
