<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import {
		Users,
		Search,
		Shield,
		KeyRound,
		LogOut,
		Trash2,
		Eye,
		Mail,
		CheckCircle2,
		AlertTriangle,
		X,
		Check,
		Lock,
		Unlock,
		Clock,
		Link2,
		Smartphone
	} from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let searchQuery = $state('');
	let selectedRoleFilter = $state<string>('all');

	// Modals state
	let passwordModalUser = $state<any | null>(null);
	let roleModalUser = $state<any | null>(null);
	let newPasswordInput = $state('');
	let isSubmitting = $state(false);

	const filteredUsers = $derived(
		data.users.filter((u) => {
			const matchesQuery =
				!searchQuery ||
				u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				u.id.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesRole =
				selectedRoleFilter === 'all' || u.role === selectedRoleFilter;

			return matchesQuery && matchesRole;
		})
	);

	function formatDate(val: string | number | Date | null | undefined): string {
		if (!val) return '—';
		return new Date(val).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function handleSpectate(userId: string) {
		if (!confirm('Start spectating this user? You will browse the dashboard with their permissions.')) {
			return;
		}

		try {
			const res = await fetch('/api/admin/impersonate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});

			const result = await res.json();
			if (!res.ok) {
				alert(result.error || 'Failed to start spectating.');
				return;
			}

			// Redirect to dashboard as user
			window.location.href = '/';
		} catch (err: any) {
			alert(err.message || 'Error initiating spectate session.');
		}
	}
</script>

<svelte:head>
	<title>User Accounts Dashboard — Run Admin</title>
</svelte:head>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<Users class="w-5 h-5 text-purple-400" />
				<span>Accounts & User Management</span>
				<span class="text-xs font-mono font-normal text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded-full border border-zinc-750">
					{data.users.length} registered
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">
				Manage accounts, roles, credentials, session security, and spectate user dashboards.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a
				href="/admin/invites"
				class="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-xs text-zinc-200 font-medium transition"
			>
				Generate VIP Invites &rarr;
			</a>
		</div>
	</div>

	<!-- Status Feedback Banner -->
	{#if form?.message}
		<div class="rounded-lg border {form?.success ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300' : 'border-red-500/20 bg-red-950/30 text-red-400'} p-3.5 text-xs flex items-center gap-2">
			<span class="font-bold">{form?.success ? 'Success:' : 'Notice:'}</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Search & Filters Toolbar -->
	<div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
		<!-- Search Bar -->
		<div class="relative flex-1 max-w-md">
			<Search class="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by name, email, or user ID..."
				class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
			/>
		</div>

		<!-- Role Filter Tabs -->
		<div class="flex items-center p-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
			{#each ['all', 'admin', 'trusted', 'member', 'suspended'] as role}
				<button
					type="button"
					onclick={() => (selectedRoleFilter = role)}
					class="px-2.5 py-1 rounded capitalize transition {selectedRoleFilter === role
						? 'bg-zinc-800 text-zinc-100 font-medium shadow-xs'
						: 'text-zinc-400 hover:text-zinc-200'}"
				>
					{role}
				</button>
			{/each}
		</div>
	</div>

	<!-- Users Table -->
	<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-mono text-[10px] uppercase">
					<tr>
						<th class="py-3 px-4">User</th>
						<th class="py-3 px-4">Role</th>
						<th class="py-3 px-4">Links</th>
						<th class="py-3 px-4">Sessions</th>
						<th class="py-3 px-4">Registered</th>
						<th class="py-3 px-4 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-800/80">
					{#if filteredUsers.length === 0}
						<tr>
							<td colspan="6" class="py-8 text-center text-zinc-500">
								No user accounts matched your search criteria.
							</td>
						</tr>
					{/if}

					{#each filteredUsers as u (u.id)}
						<tr class="hover:bg-zinc-850/30 transition-colors">
							<!-- User info -->
							<td class="py-3.5 px-4">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-200 shrink-0">
										{u.name?.charAt(0).toUpperCase() || 'U'}
									</div>
									<div class="min-w-0">
										<div class="font-medium text-zinc-100 truncate flex items-center gap-1.5">
											<span>{u.name}</span>
											{#if u.isSelf}
												<span class="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">You</span>
											{/if}
										</div>
										<div class="text-[11px] text-zinc-400 font-mono truncate">{u.email}</div>
									</div>
								</div>
							</td>

							<!-- Role badge -->
							<td class="py-3.5 px-4">
								<span
									class="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold {u.role === 'admin'
										? 'bg-purple-950 text-purple-300 border border-purple-800/60'
										: u.role === 'trusted'
											? 'bg-sky-950 text-sky-300 border border-sky-800/60'
											: u.role === 'suspended'
												? 'bg-red-950 text-red-400 border border-red-800/60'
												: 'bg-zinc-800 text-zinc-300 border border-zinc-700'}"
								>
									{u.role}
								</span>
							</td>

							<!-- Links count -->
							<td class="py-3.5 px-4 font-mono text-zinc-300">
								<div class="flex items-center gap-1.5">
									<Link2 class="w-3.5 h-3.5 text-zinc-500" />
									<span>{u.linksCount}</span>
								</div>
							</td>

							<!-- Sessions count -->
							<td class="py-3.5 px-4 font-mono text-zinc-300">
								<div class="flex items-center gap-1.5">
									<Smartphone class="w-3.5 h-3.5 text-zinc-500" />
									<span>{u.sessionsCount}</span>
								</div>
							</td>

							<!-- Date -->
							<td class="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
								{formatDate(u.createdAt)}
							</td>

							<!-- Actions -->
							<td class="py-3.5 px-4 text-right">
								<div class="inline-flex items-center gap-1.5">
									<!-- Spectate / Impersonate Button -->
									{#if !u.isSelf && u.role !== 'admin'}
										<button
											type="button"
											onclick={() => handleSpectate(u.id)}
											title="Spectate as this user"
											class="p-1.5 rounded-md border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-950/20 text-zinc-400 hover:text-amber-300 transition cursor-pointer"
										>
											<Eye class="w-3.5 h-3.5" />
										</button>
									{/if}

									<!-- Edit Role Button -->
									<button
										type="button"
										onclick={() => (roleModalUser = u)}
										title="Edit user role"
										class="p-1.5 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
									>
										<Shield class="w-3.5 h-3.5" />
									</button>

									<!-- Reset Password Button -->
									<button
										type="button"
										onclick={() => {
											passwordModalUser = u;
											newPasswordInput = '';
										}}
										title="Reset password or send link"
										class="p-1.5 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
									>
										<KeyRound class="w-3.5 h-3.5" />
									</button>

									<!-- Terminate Sessions -->
									{#if u.sessionsCount > 0}
										<form method="post" action="?/revokeSessions" use:enhance class="inline">
											<input type="hidden" name="userId" value={u.id} />
											<button
												type="submit"
												title="Terminate all active sessions"
												class="p-1.5 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
											>
												<LogOut class="w-3.5 h-3.5" />
											</button>
										</form>
									{/if}

									<!-- Delete User Button -->
									{#if !u.isSelf}
										<form
											method="post"
											action="?/deleteUser"
											use:enhance={({ cancel }) => {
												if (!confirm(`Permanently delete ${u.name} (${u.email}) and all their links?`)) {
													cancel();
												}
											}}
											class="inline"
										>
											<input type="hidden" name="userId" value={u.id} />
											<button
												type="submit"
												title="Delete user account"
												class="p-1.5 rounded-md border border-zinc-800 hover:border-red-900/50 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"
											>
												<Trash2 class="w-3.5 h-3.5" />
											</button>
										</form>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal: Edit User Role -->
{#if roleModalUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
		<div class="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
			<div class="flex items-center justify-between pb-2 border-b border-zinc-800">
				<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
					Edit Privilege Role
				</h3>
				<button
					type="button"
					onclick={() => (roleModalUser = null)}
					class="p-1 text-zinc-500 hover:text-white"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<p class="text-xs text-zinc-400">
				Updating role for <strong class="text-zinc-200">{roleModalUser.name}</strong> ({roleModalUser.email}).
			</p>

			<form
				method="post"
				action="?/updateRole"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						roleModalUser = null;
						await update();
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="userId" value={roleModalUser.id} />

				<div>
					<label for="selectUserRole" class="block text-[11px] font-medium text-zinc-400 mb-1">Assigned Role</label>
					<select
						id="selectUserRole"
						name="role"
						value={roleModalUser.role}
						class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
					>
						<option value="member">Member (Standard link manager)</option>
						<option value="trusted">Trusted (Can create VIP invite codes)</option>
						<option value="admin">Administrator (Full control)</option>
						<option value="suspended">Suspended (Blocked from access)</option>
					</select>
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button
						type="button"
						onclick={() => (roleModalUser = null)}
						class="px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200"
					>
						Save Role
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Reset Password -->
{#if passwordModalUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
		<div class="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
			<div class="flex items-center justify-between pb-2 border-b border-zinc-800">
				<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center gap-1.5">
					<KeyRound class="w-4 h-4 text-purple-400" />
					<span>Reset User Password</span>
				</h3>
				<button
					type="button"
					onclick={() => (passwordModalUser = null)}
					class="p-1 text-zinc-500 hover:text-white"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<p class="text-xs text-zinc-400">
				Account: <strong class="text-zinc-200">{passwordModalUser.name}</strong> ({passwordModalUser.email})
			</p>

			<!-- Option A: Send Password Reset Email -->
			<div class="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/70 space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-zinc-200">Send Reset Email Link</span>
					<form
						method="post"
						action="?/sendResetEmail"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								isSubmitting = false;
								passwordModalUser = null;
								await update();
							};
						}}
					>
						<input type="hidden" name="email" value={passwordModalUser.email} />
						<button
							type="submit"
							disabled={isSubmitting}
							class="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium border border-zinc-700 transition flex items-center gap-1 cursor-pointer"
						>
							<Mail class="w-3.5 h-3.5 text-sky-400" />
							<span>Email Link</span>
						</button>
					</form>
				</div>
				<p class="text-[11px] text-zinc-500">
					Dispatches a secure password reset link via SMTP to the user's verified address.
				</p>
			</div>

			<!-- Option B: Direct Password Reset -->
			<form
				method="post"
				action="?/resetPassword"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						passwordModalUser = null;
						await update();
					};
				}}
				class="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/70 space-y-3"
			>
				<input type="hidden" name="userId" value={passwordModalUser.id} />
				<span class="block text-xs font-semibold text-zinc-200">Or Set New Password Directly</span>

				<div>
					<label for="adminSetPassword" class="block text-[11px] text-zinc-400 mb-1">New Password (min 8 chars)</label>
					<input
						id="adminSetPassword"
						type="password"
						name="newPassword"
						bind:value={newPasswordInput}
						required
						minlength="8"
						placeholder="••••••••••••"
						class="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
					/>
				</div>

				<div class="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onclick={() => (passwordModalUser = null)}
						class="px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting || newPasswordInput.length < 8}
						class="px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition disabled:opacity-50"
					>
						Save New Password
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
