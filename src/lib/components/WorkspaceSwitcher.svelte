<script lang="ts">
	import { page } from '$app/state';
	import {
		Check,
		ChevronsUpDown,
		Plus,
		Users,
		User,
		Building,
		Copy,
		CheckCheck,
		X,
		Mail,
		ShieldCheck,
		ExternalLink
	} from 'lucide-svelte';

	interface Props {
		compact?: boolean;
	}

	let { compact = false }: Props = $props();

	const activeWorkspace = $derived(page.data.activeWorkspace);
	const userWorkspaces = $derived(page.data.userWorkspaces || []);
	const currentUser = $derived(page.data.user);

	const canCreateWorkspace = $derived(
		currentUser?.role === 'trusted' || currentUser?.role === 'admin'
	);
	const isOwnerOrAdmin = $derived(
		currentUser?.role === 'admin' ||
		activeWorkspace?.role === 'owner' ||
		activeWorkspace?.role === 'admin'
	);

	let dropdownOpen = $state(false);
	let createModalOpen = $state(false);
	let inviteModalOpen = $state(false);

	let newWorkspaceName = $state('');
	let inviteEmail = $state('');
	let inviteRole = $state('member');
	let isSubmitting = $state(false);
	let actionError = $state('');
	let actionSuccess = $state('');
	let generatedInviteLink = $state('');
	let copiedLink = $state(false);

	async function switchWorkspace(workspaceId: string) {
		if (activeWorkspace?.id === workspaceId) {
			dropdownOpen = false;
			return;
		}

		isSubmitting = true;
		try {
			const res = await fetch('/api/workspaces/switch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ workspaceId })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to switch workspace');
			}

			dropdownOpen = false;
			window.location.reload();
		} catch (err: any) {
			alert(err.message);
		} finally {
			isSubmitting = false;
		}
	}

	async function createWorkspace() {
		if (!newWorkspaceName.trim()) return;

		isSubmitting = true;
		actionError = '';
		try {
			const res = await fetch('/api/workspaces/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newWorkspaceName.trim() })
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to create workspace');
			}

			createModalOpen = false;
			newWorkspaceName = '';
			window.location.reload();
		} catch (err: any) {
			actionError = err.message;
		} finally {
			isSubmitting = false;
		}
	}

	async function sendInvite() {
		if (!activeWorkspace?.id) return;

		isSubmitting = true;
		actionError = '';
		actionSuccess = '';
		try {
			const res = await fetch('/api/workspaces/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					workspaceId: activeWorkspace.id,
					email: inviteEmail.trim() || undefined,
					role: inviteRole
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to create invite');
			}

			generatedInviteLink = data.joinUrl;
			if (data.emailSent) {
				actionSuccess = `Invitation sent to ${inviteEmail}!`;
				inviteEmail = '';
			}
		} catch (err: any) {
			actionError = err.message;
		} finally {
			isSubmitting = false;
		}
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedLink = true;
			setTimeout(() => {
				copiedLink = false;
			}, 2500);
		} catch {}
	}
</script>

<div class="relative w-full">
	<!-- Trigger Button -->
	<button
		type="button"
		onclick={() => (dropdownOpen = !dropdownOpen)}
		class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 transition text-left cursor-pointer group"
	>
		<div class="flex items-center gap-2.5 min-w-0">
			<div
				class="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 {activeWorkspace?.isPersonal
					? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
					: 'bg-blue-600 text-white shadow-xs'}"
			>
				{#if activeWorkspace?.isPersonal}
					<User class="w-3.5 h-3.5" />
				{:else}
					<Building class="w-3.5 h-3.5" />
				{/if}
			</div>
			<div class="flex flex-col min-w-0">
				<span class="text-xs font-semibold text-zinc-200 truncate leading-tight group-hover:text-white">
					{activeWorkspace?.name || 'My Workspace'}
				</span>
				<span class="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
					{activeWorkspace?.isPersonal ? 'Personal' : 'Team'}
					<span class="text-zinc-600">•</span>
					<span class="capitalize">{activeWorkspace?.role || 'member'}</span>
				</span>
			</div>
		</div>
		<ChevronsUpDown class="w-3.5 h-3.5 text-zinc-500 shrink-0 group-hover:text-zinc-300 transition" />
	</button>

	<!-- Backdrop for dropdown -->
	{#if dropdownOpen}
		<div
			class="fixed inset-0 z-40"
			tabindex="-1"
			role="button"
			aria-label="Close dropdown"
			onclick={() => (dropdownOpen = false)}
			onkeydown={(e) => e.key === 'Escape' && (dropdownOpen = false)}
		></div>

		<!-- Dropdown Menu -->
		<div
			class="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-zinc-800 bg-[#121215] shadow-2xl p-1.5 space-y-1 min-w-[220px]"
		>
			<div class="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
				Workspaces ({userWorkspaces.length})
			</div>

			<div class="max-h-56 overflow-y-auto space-y-0.5">
				{#each userWorkspaces as ws}
					{@const isSelected = ws.id === activeWorkspace?.id}
					<button
						type="button"
						onclick={() => switchWorkspace(ws.id)}
						class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition cursor-pointer {isSelected
							? 'bg-zinc-800 text-white font-semibold'
							: 'text-zinc-300 hover:bg-zinc-850 hover:text-white'}"
					>
						<div class="flex items-center gap-2 min-w-0">
							<div
								class="w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0 {ws.isPersonal
									? 'bg-amber-500/20 text-amber-400'
									: 'bg-blue-600/30 text-blue-400'}"
							>
								{#if ws.isPersonal}
									<User class="w-3 h-3" />
								{:else}
									<Building class="w-3 h-3" />
								{/if}
							</div>
							<span class="truncate">{ws.name}</span>
						</div>
						{#if isSelected}
							<Check class="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2" />
						{/if}
					</button>
				{/each}
			</div>

			<div class="pt-1.5 mt-1 border-t border-zinc-800/80 space-y-0.5">
				{#if isOwnerOrAdmin && !activeWorkspace?.isPersonal}
					<button
						type="button"
						onclick={() => {
							dropdownOpen = false;
							inviteModalOpen = true;
							actionError = '';
							actionSuccess = '';
							generatedInviteLink = '';
						}}
						class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-850 transition cursor-pointer"
					>
						<Users class="w-3.5 h-3.5 text-amber-400" />
						<span>Invite Members...</span>
					</button>
				{/if}

				{#if canCreateWorkspace}
					<button
						type="button"
						onclick={() => {
							dropdownOpen = false;
							createModalOpen = true;
							actionError = '';
							newWorkspaceName = '';
						}}
						class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-850 transition cursor-pointer"
					>
						<Plus class="w-3.5 h-3.5 text-blue-400" />
						<span>Create Team Workspace...</span>
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Modal: Create Team Workspace -->
{#if createModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
		<div class="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl p-5 space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-zinc-100 font-bold text-sm">
					<Building class="w-4 h-4 text-blue-400" />
					<span>New Team Workspace</span>
				</div>
				<button
					type="button"
					onclick={() => (createModalOpen = false)}
					class="text-zinc-500 hover:text-zinc-300 transition"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<p class="text-xs text-zinc-400">
				Team Workspaces let you organize links, add custom domains, and collaborate with invited team members.
			</p>

			{#if actionError}
				<div class="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-300">
					{actionError}
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					createWorkspace();
				}}
				class="space-y-3"
			>
				<div>
					<label for="ws-name-input" class="text-[11px] font-medium text-zinc-300 block mb-1">
						Workspace Name
					</label>
					<input
						id="ws-name-input"
						type="text"
						bind:value={newWorkspaceName}
						placeholder="Acme Growth Marketing"
						required
						class="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
					/>
				</div>

				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						type="button"
						onclick={() => (createModalOpen = false)}
						class="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting || !newWorkspaceName.trim()}
						class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition disabled:opacity-50"
					>
						{isSubmitting ? 'Creating...' : 'Create Workspace'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Invite Members -->
{#if inviteModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
		<div class="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl p-5 space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-zinc-100 font-bold text-sm">
					<Users class="w-4 h-4 text-amber-400" />
					<span>Invite to {activeWorkspace?.name}</span>
				</div>
				<button
					type="button"
					onclick={() => (inviteModalOpen = false)}
					class="text-zinc-500 hover:text-zinc-300 transition"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<p class="text-xs text-zinc-400">
				Invite team members via direct email or generate a shareable invitation link.
			</p>

			{#if actionError}
				<div class="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-300">
					{actionError}
				</div>
			{/if}

			{#if actionSuccess}
				<div class="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-300">
					{actionSuccess}
				</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label for="inv-email-input" class="text-[11px] font-medium text-zinc-300 block mb-1">
						Recipient Email (Optional)
					</label>
					<div class="flex gap-2">
						<input
							id="inv-email-input"
							type="email"
							bind:value={inviteEmail}
							placeholder="colleague@company.com"
							class="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
						/>
						<select
							bind:value={inviteRole}
							class="px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 transition"
						>
							<option value="member">Member</option>
							<option value="admin">Admin</option>
						</select>
					</div>
				</div>

				<button
					type="button"
					onclick={sendInvite}
					disabled={isSubmitting}
					class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition disabled:opacity-50"
				>
					<Mail class="w-3.5 h-3.5" />
					<span>{inviteEmail.trim() ? 'Send Email Invitation' : 'Generate Join Link'}</span>
				</button>

				{#if generatedInviteLink}
					<div class="pt-2 border-t border-zinc-800 space-y-1.5">
						<span class="text-[11px] font-medium text-zinc-300 block">
							Shareable Invitation Link (Expires in 7 days):
						</span>
						<div class="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
							<input
								readonly
								value={generatedInviteLink}
								class="flex-1 bg-transparent border-0 px-2 text-xs font-mono text-zinc-300 focus:outline-none select-all"
							/>
							<button
								type="button"
								onclick={() => copyToClipboard(generatedInviteLink)}
								class="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium transition flex items-center gap-1 shrink-0 cursor-pointer"
							>
								{#if copiedLink}
									<CheckCheck class="w-3.5 h-3.5 text-emerald-400" />
									<span class="text-emerald-400">Copied</span>
								{:else}
									<Copy class="w-3.5 h-3.5" />
									<span>Copy</span>
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</div>

			<div class="flex justify-end pt-2">
				<button
					type="button"
					onclick={() => (inviteModalOpen = false)}
					class="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
