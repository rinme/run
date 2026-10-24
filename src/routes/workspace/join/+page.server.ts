import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { organization, user, member } from '#lib/server/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { verifyWorkspaceInviteToken, acceptWorkspaceInvite } from '#lib/server/workspaces.ts';

export const load: PageServerLoad = async ({ url, locals }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return {
			valid: false,
			error: 'No invitation token provided.'
		};
	}

	const tokenData = verifyWorkspaceInviteToken(token);
	if (!tokenData) {
		return {
			valid: false,
			error: 'This invitation link is invalid or has expired.'
		};
	}

	const [org] = await db
		.select({ id: organization.id, name: organization.name, slug: organization.slug })
		.from(organization)
		.where(eq(organization.id, tokenData.workspaceId))
		.limit(1);

	if (!org) {
		return {
			valid: false,
			error: 'The invited workspace no longer exists.'
		};
	}

	const [inviter] = await db
		.select({ name: user.name, email: user.email })
		.from(user)
		.where(eq(user.id, tokenData.inviterId))
		.limit(1);

	let alreadyMember = false;
	if (locals.user?.id) {
		const [existing] = await db
			.select()
			.from(member)
			.where(and(eq(member.organizationId, org.id), eq(member.userId, locals.user.id)))
			.limit(1);
		alreadyMember = !!existing;
	}

	return {
		valid: true,
		token,
		workspace: org,
		role: tokenData.role,
		inviter: inviter ? inviter.name || inviter.email : 'A team member',
		user: locals.user ?? null,
		alreadyMember
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, url }) => {
		if (!locals.user?.id) {
			const token = url.searchParams.get('token') || '';
			throw redirect(302, `/login?redirectTo=${encodeURIComponent(`/workspace/join?token=${token}`)}`);
		}

		const formData = await request.formData();
		const token = (formData.get('token') as string) || url.searchParams.get('token') || '';

		if (!token) {
			return fail(400, { error: 'Invitation token is missing' });
		}

		try {
			const result = await acceptWorkspaceInvite(token, locals.user.id);
			cookies.set('run_active_workspace', result.workspace.id, {
				path: '/',
				httpOnly: false,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 365
			});
		} catch (err: any) {
			return fail(400, { error: err.message || 'Failed to accept invitation' });
		}

		throw redirect(303, '/');
	}
};
