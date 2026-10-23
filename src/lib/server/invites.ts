import { db } from '#lib/server/db/index.ts';
import { inviteCodes, type InviteCode } from '#lib/server/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

/**
 * Generates a crypto-random VIP invite code format: RUN-VIP-XXXXX
 */
export function generateRandomCode(prefix = 'RUN-VIP'): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let part = '';
	for (let i = 0; i < 5; i++) {
		part += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return `${prefix}-${part}`;
}

/**
 * Validates whether an invite code is active, not expired, and below max uses
 */
export async function validateInviteCode(code: string): Promise<{
	valid: boolean;
	reason?: string;
	invite?: InviteCode;
}> {
	const cleanCode = code.trim().toUpperCase();
	if (!cleanCode) {
		return { valid: false, reason: 'Invite code is required' };
	}

	const [invite] = await db
		.select()
		.from(inviteCodes)
		.where(eq(inviteCodes.code, cleanCode))
		.limit(1);

	if (!invite) {
		return { valid: false, reason: 'Invalid or unknown invite code' };
	}

	if (!invite.isActive) {
		return { valid: false, reason: 'This invite code has been deactivated' };
	}

	if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
		return { valid: false, reason: 'This invite code has expired' };
	}

	if (invite.usedCount >= invite.maxUses) {
		return { valid: false, reason: 'This invite code has reached its maximum uses' };
	}

	return { valid: true, invite };
}

/**
 * Increments the used count for an invite code upon successful registration
 */
export async function consumeInviteCode(
	code: string
): Promise<{ success: boolean; role: string; error?: string }> {
	const validation = await validateInviteCode(code);
	if (!validation.valid || !validation.invite) {
		return { success: false, role: 'member', error: validation.reason };
	}

	const updatedCount = validation.invite.usedCount + 1;
	await db
		.update(inviteCodes)
		.set({
			usedCount: updatedCount,
			isActive: updatedCount < validation.invite.maxUses
		})
		.where(eq(inviteCodes.id, validation.invite.id));

	return {
		success: true,
		role: validation.invite.role || 'member'
	};
}

/**
 * Creates a new invite code
 */
export async function createInviteCode(params: {
	code?: string;
	maxUses?: number;
	role?: 'admin' | 'trusted' | 'member';
	expiresAt?: Date | null;
	creatorId?: string;
}): Promise<InviteCode> {
	const code = (params.code?.trim().toUpperCase() || generateRandomCode()).replace(/\s+/g, '-');
	const [created] = await db
		.insert(inviteCodes)
		.values({
			code,
			maxUses: params.maxUses || 1,
			role: params.role || 'member',
			expiresAt: params.expiresAt || null,
			creatorId: params.creatorId || null,
			isActive: true
		})
		.returning();

	return created;
}

/**
 * Lists all invite codes
 */
export async function listInviteCodes() {
	return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
}
