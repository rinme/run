import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { member, organization, user } from '#lib/server/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { createWorkspaceInviteToken } from '#lib/server/workspaces.ts';
import { sendWorkspaceInviteEmail } from '#lib/server/email.ts';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json().catch(() => ({}));
	const workspaceId = body.workspaceId;
	const recipientEmail = (body.email || '').trim().toLowerCase();
	const role = body.role || 'member';

	if (!workspaceId) {
		return json({ error: 'Missing workspaceId' }, { status: 400 });
	}

	// Verify workspace exists
	const [org] = await db.select().from(organization).where(eq(organization.id, workspaceId)).limit(1);
	if (!org) {
		return json({ error: 'Workspace not found' }, { status: 404 });
	}

	// Verify user is an owner or admin of the workspace (or system admin)
	const isSysAdmin = (locals.user as { role?: string }).role === 'admin';
	const [userMembership] = await db
		.select()
		.from(member)
		.where(and(eq(member.userId, locals.user.id), eq(member.organizationId, workspaceId)))
		.limit(1);

	if (!isSysAdmin && (!userMembership || (userMembership.role !== 'owner' && userMembership.role !== 'admin'))) {
		return json({ error: 'You must be a workspace owner or administrator to invite members' }, { status: 403 });
	}

	// Generate invite token
	const token = createWorkspaceInviteToken(workspaceId, locals.user.id, role);
	const origin = url.origin;
	const joinUrl = `${origin}/workspace/join?token=${token}`;

	let emailResult = null;
	if (recipientEmail) {
		emailResult = await sendWorkspaceInviteEmail({
			recipient: recipientEmail,
			workspaceName: org.name,
			joinUrl,
			inviterName: locals.user.name || locals.user.email,
			role
		});
	}

	return json({
		success: true,
		token,
		joinUrl,
		emailSent: !!recipientEmail,
		emailResult
	});
};
