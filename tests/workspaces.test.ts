import { describe, it, expect } from 'bun:test';
import {
	generateWorkspaceSlug,
	validateWorkspaceAccess,
	createWorkspaceInviteToken,
	verifyWorkspaceInviteToken
} from '../src/lib/server/workspaces';

describe('Workspace Service Logic', () => {
	it('should generate clean URL-safe slugs from workspace names', () => {
		expect(generateWorkspaceSlug('Marketing Team 2026!')).toBe('marketing-team-2026');
		expect(generateWorkspaceSlug("Alex's Personal")).toBe('alexs-personal');
		expect(generateWorkspaceSlug('   Run   ')).toBe('run');
	});

	it('should validate membership access properly', () => {
		const memberships = [
			{ organizationId: 'ws_1', role: 'owner' },
			{ organizationId: 'ws_2', role: 'member' }
		];

		expect(validateWorkspaceAccess('ws_1', memberships)).toBe(true);
		expect(validateWorkspaceAccess('ws_2', memberships)).toBe(true);
		expect(validateWorkspaceAccess('ws_999', memberships)).toBe(false);
	});

	it('should create and verify signed workspace join tokens', () => {
		const token = createWorkspaceInviteToken('ws_alpha', 'user_123', 'member');
		expect(typeof token).toBe('string');

		const verified = verifyWorkspaceInviteToken(token);
		expect(verified).not.toBeNull();
		expect(verified?.workspaceId).toBe('ws_alpha');
		expect(verified?.inviterId).toBe('user_123');
		expect(verified?.role).toBe('member');
	});

	it('should reject tampered or invalid tokens', () => {
		expect(verifyWorkspaceInviteToken('invalid-garbage-token')).toBeNull();
		expect(verifyWorkspaceInviteToken('')).toBeNull();
	});
});
