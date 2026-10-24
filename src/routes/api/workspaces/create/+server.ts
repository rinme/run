import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createTeamWorkspace } from '#lib/server/workspaces.ts';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userRole = (locals.user as { role?: string }).role;
	if (userRole !== 'trusted' && userRole !== 'admin') {
		return json(
			{ error: 'Only Trusted members and Administrators can create Team Workspaces' },
			{ status: 403 }
		);
	}

	const body = await request.json().catch(() => ({}));
	const name = (body.name || '').trim();

	if (!name) {
		return json({ error: 'Workspace name is required' }, { status: 400 });
	}

	try {
		const newWorkspace = await createTeamWorkspace(locals.user.id, name);

		// Switch to newly created workspace
		cookies.set('run_active_workspace', newWorkspace.id, {
			path: '/',
			httpOnly: false,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});

		return json({ success: true, workspace: newWorkspace }, { status: 201 });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create workspace' }, { status: 500 });
	}
};
