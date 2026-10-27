import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { inviteCodes } from '#lib/server/db/schema.ts';
import { createInviteCode } from '#lib/server/invites.ts';
import { sendInviteEmail } from '#lib/server/email.ts';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const operator = event.locals.impersonator || event.locals.user;
	if (!operator || operator.role !== 'admin') throw redirect(302, '/');

	const allInvites = await db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));

	return {
		invites: allInvites,
		user: operator
	};
};

export const actions: Actions = {
	createInvite: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const code = formData.get('code')?.toString().trim();
		const maxUses = parseInt(formData.get('maxUses')?.toString() || '1', 10);
		const role = (formData.get('role')?.toString() as any) || 'member';

		try {
			await createInviteCode({
				code: code || undefined,
				maxUses: isNaN(maxUses) ? 1 : maxUses,
				role,
				creatorId: operator.id
			});
			return { success: true, message: 'Invite code created successfully' };
		} catch (e) {
			return fail(400, { message: (e as Error).message });
		}
	},

	toggleInvite: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const inviteId = formData.get('inviteId')?.toString();

		if (!inviteId) return fail(400, { message: 'Invite ID required' });

		const [target] = await db.select().from(inviteCodes).where(eq(inviteCodes.id, inviteId)).limit(1);
		if (target) {
			await db
				.update(inviteCodes)
				.set({ isActive: !target.isActive })
				.where(eq(inviteCodes.id, inviteId));
		}

		return { success: true, message: 'Invite code status toggled' };
	},

	deleteInvite: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const inviteId = formData.get('inviteId')?.toString();

		if (!inviteId) return fail(400, { message: 'Invite ID required' });

		await db.delete(inviteCodes).where(eq(inviteCodes.id, inviteId));
		return { success: true, message: 'Invite code deleted' };
	},

	sendInviteEmail: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const inviteId = formData.get('inviteId')?.toString();
		const recipientEmail = formData.get('recipientEmail')?.toString().trim().toLowerCase();

		if (!recipientEmail || !recipientEmail.includes('@')) {
			return fail(400, { message: 'A valid recipient email address is required' });
		}

		if (!inviteId) return fail(400, { message: 'Invite ID is required' });

		const [target] = await db.select().from(inviteCodes).where(eq(inviteCodes.id, inviteId)).limit(1);
		if (!target) {
			return fail(404, { message: 'Invite code not found' });
		}

		try {
			const result = await sendInviteEmail({
				recipient: recipientEmail,
				code: target.code,
				role: target.role,
				origin: event.url.origin,
				maxUses: target.maxUses,
				inviterName: operator.name || 'Run Administrator'
			});

			if (!result.success) {
				return fail(500, { message: result.error || 'Failed to dispatch email' });
			}

			return {
				success: true,
				message: `Invitation email sent to ${recipientEmail} via ${result.provider}`
			};
		} catch (err: any) {
			return fail(500, { message: err.message || 'Email delivery failed' });
		}
	},

	createAndEmailInvite: async (event) => {
		const operator = event.locals.impersonator || event.locals.user;
		if (!operator || operator.role !== 'admin') throw redirect(302, '/');

		const formData = await event.request.formData();
		const code = formData.get('code')?.toString().trim();
		const maxUses = parseInt(formData.get('maxUses')?.toString() || '1', 10);
		const role = (formData.get('role')?.toString() as any) || 'member';
		const recipientEmail = formData.get('recipientEmail')?.toString().trim().toLowerCase();

		if (!recipientEmail || !recipientEmail.includes('@')) {
			return fail(400, { message: 'A valid recipient email address is required' });
		}

		try {
			const newInvite = await createInviteCode({
				code: code || undefined,
				maxUses: isNaN(maxUses) ? 1 : maxUses,
				role,
				creatorId: operator.id
			});

			const result = await sendInviteEmail({
				recipient: recipientEmail,
				code: newInvite.code,
				role: newInvite.role,
				origin: event.url.origin,
				maxUses: newInvite.maxUses,
				inviterName: operator.name || 'Run Administrator'
			});

			if (!result.success) {
				return fail(500, {
					message: `Invite code ${newInvite.code} created, but email failed: ${result.error || 'delivery error'}`
				});
			}

			return {
				success: true,
				message: `VIP invitation (${newInvite.code}) created and sent to ${recipientEmail}!`
			};
		} catch (err: any) {
			return fail(500, { message: err.message || 'Failed to create and dispatch invite' });
		}
	}
};
