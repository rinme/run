import { db } from '#lib/server/db/index.ts';
import { organization, member, user, invitation } from '#lib/server/db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { createHmac } from 'node:crypto';

export interface UserWorkspace {
	id: string;
	name: string;
	slug: string;
	role: string;
	isPersonal: boolean;
	createdAt: Date | number;
}

/**
 * Generates a clean URL-safe slug
 */
export function generateWorkspaceSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/['"]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.trim() || 'workspace';
}

/**
 * Validates if a user has access to a given workspace ID
 */
export function validateWorkspaceAccess(
	workspaceId: string,
	memberships: Array<{ organizationId: string }>
): boolean {
	return memberships.some((m) => m.organizationId === workspaceId);
}

/**
 * Ensures a user has a private Personal Workspace and returns it.
 */
export async function ensurePersonalWorkspace(
	userId: string,
	userName?: string
): Promise<UserWorkspace> {
	// 1. Look for existing personal workspace
	const userMemberships = await db
		.select({
			id: organization.id,
			name: organization.name,
			slug: organization.slug,
			metadata: organization.metadata,
			createdAt: organization.createdAt,
			role: member.role
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(member.userId, userId));

	const personal = userMemberships.find((m) => {
		try {
			if (m.metadata) {
				const meta = JSON.parse(m.metadata);
				if (meta.isPersonal) return true;
			}
		} catch {}
		return m.slug.includes('-personal');
	});

	if (personal) {
		return {
			id: personal.id,
			name: personal.name,
			slug: personal.slug,
			role: personal.role,
			isPersonal: true,
			createdAt: personal.createdAt
		};
	}

	// 2. If user already has any workspace membership, pick the first as primary
	if (userMemberships.length > 0) {
		const first = userMemberships[0];
		return {
			id: first.id,
			name: first.name,
			slug: first.slug,
			role: first.role,
			isPersonal: false,
			createdAt: first.createdAt
		};
	}

	// 3. Create a brand new Personal Workspace for this user
	const displayName = userName ? `${userName}'s Workspace` : 'Personal Workspace';
	const orgId = crypto.randomUUID();
	const baseSlug = generateWorkspaceSlug(userName ? `${userName}-personal` : `personal-${userId.slice(0, 8)}`);
	const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

	await db.insert(organization).values({
		id: orgId,
		name: displayName,
		slug: uniqueSlug,
		metadata: JSON.stringify({ isPersonal: true, ownerId: userId }),
		createdAt: new Date()
	});

	await db.insert(member).values({
		id: crypto.randomUUID(),
		organizationId: orgId,
		userId: userId,
		role: 'owner',
		createdAt: new Date()
	});

	return {
		id: orgId,
		name: displayName,
		slug: uniqueSlug,
		role: 'owner',
		isPersonal: true,
		createdAt: new Date()
	};
}

/**
 * Returns all workspaces the user is a member of
 */
export async function getUserWorkspaces(userId: string): Promise<UserWorkspace[]> {
	// First ensure personal workspace exists
	await ensurePersonalWorkspace(userId);

	const rows = await db
		.select({
			id: organization.id,
			name: organization.name,
			slug: organization.slug,
			metadata: organization.metadata,
			createdAt: organization.createdAt,
			role: member.role
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(member.userId, userId));

	return rows.map((r) => {
		let isPersonal = false;
		try {
			if (r.metadata) {
				const meta = JSON.parse(r.metadata);
				isPersonal = !!meta.isPersonal;
			}
		} catch {}
		if (r.slug.includes('-personal')) isPersonal = true;

		return {
			id: r.id,
			name: r.name,
			slug: r.slug,
			role: r.role,
			isPersonal,
			createdAt: r.createdAt
		};
	});
}

/**
 * Creates a new Team Workspace (requires role 'trusted' or 'admin')
 */
export async function createTeamWorkspace(
	creatorId: string,
	name: string
): Promise<UserWorkspace> {
	const trimmedName = name.trim();
	if (!trimmedName) throw new Error('Workspace name cannot be empty');

	// Verify creator permissions
	const [currentUser] = await db.select().from(user).where(eq(user.id, creatorId)).limit(1);
	if (!currentUser || (currentUser.role !== 'trusted' && currentUser.role !== 'admin')) {
		throw new Error('Only Trusted users and Administrators can create Team Workspaces');
	}

	const orgId = crypto.randomUUID();
	const baseSlug = generateWorkspaceSlug(trimmedName);
	const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

	await db.insert(organization).values({
		id: orgId,
		name: trimmedName,
		slug: uniqueSlug,
		metadata: JSON.stringify({ isPersonal: false, ownerId: creatorId }),
		createdAt: new Date()
	});

	await db.insert(member).values({
		id: crypto.randomUUID(),
		organizationId: orgId,
		userId: creatorId,
		role: 'owner',
		createdAt: new Date()
	});

	return {
		id: orgId,
		name: trimmedName,
		slug: uniqueSlug,
		role: 'owner',
		isPersonal: false,
		createdAt: new Date()
	};
}

const INVITE_SECRET = process.env.BETTER_AUTH_SECRET || 'run-workspace-secret-key-321';

/**
 * Creates a tamper-proof invite token for a workspace
 */
export function createWorkspaceInviteToken(workspaceId: string, inviterId: string, role = 'member'): string {
	const payload = `${workspaceId}:${inviterId}:${role}:${Date.now()}`;
	const signature = createHmac('sha256', INVITE_SECRET).update(payload).digest('hex').slice(0, 16);
	return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

/**
 * Validates and decodes a workspace invite token
 */
export function verifyWorkspaceInviteToken(token: string): { workspaceId: string; inviterId: string; role: string } | null {
	try {
		const decoded = Buffer.from(token, 'base64url').toString('utf8');
		const parts = decoded.split(':');
		if (parts.length !== 5) return null;

		const [workspaceId, inviterId, role, timestampStr, signature] = parts;
		const payload = `${workspaceId}:${inviterId}:${role}:${timestampStr}`;
		const expectedSig = createHmac('sha256', INVITE_SECRET).update(payload).digest('hex').slice(0, 16);

		if (signature !== expectedSig) return null;

		// 7 days expiration
		const timestamp = parseInt(timestampStr, 10);
		if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) return null;

		return { workspaceId, inviterId, role };
	} catch {
		return null;
	}
}

/**
 * Adds a user to a workspace using an invite token
 */
export async function acceptWorkspaceInvite(token: string, userId: string) {
	const inviteInfo = verifyWorkspaceInviteToken(token);
	if (!inviteInfo) throw new Error('Invalid or expired workspace invitation link');

	const [org] = await db.select().from(organization).where(eq(organization.id, inviteInfo.workspaceId)).limit(1);
	if (!org) throw new Error('Workspace not found');

	// Check if already a member
	const [existingMember] = await db
		.select()
		.from(member)
		.where(and(eq(member.organizationId, inviteInfo.workspaceId), eq(member.userId, userId)))
		.limit(1);

	if (existingMember) {
		return { success: true, workspace: org, alreadyMember: true };
	}

	await db.insert(member).values({
		id: crypto.randomUUID(),
		organizationId: inviteInfo.workspaceId,
		userId: userId,
		role: inviteInfo.role || 'member',
		createdAt: new Date()
	});

	return { success: true, workspace: org, alreadyMember: false };
}
