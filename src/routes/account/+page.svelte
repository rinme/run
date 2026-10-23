<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import {
		User,
		Shield,
		KeyRound,
		Monitor,
		LogOut,
		Ticket,
		Copy,
		Check,
		Trash2,
		Plus,
		Clock
	} from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let copiedCode = $state<string | null>(null);
	let isGeneratingInvite = $state(false);

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedCode = id;
		setTimeout(() => {
			if (copiedCode === id) copiedCode = null;
		}, 2000);
	}

	function formatDate(val: string | number | Date | null | undefined): string {
		if (!val) return '—';
		return new Date(val).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Account & Security — Run</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-8">
	<!-- Page Header -->
	<div class="flex items-center justify-between border-b border-zinc-800 pb-5">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<User class="w-5 h-5 text-zinc-400" />
				Account & Credentials
			</h1>
			<p class="text-xs text-zinc-400 mt-1">
				Manage your personal profile, active sessions, and authorized invite keys
			</p>
		</div>
		<form method="post" action="?/signOut" use:enhance>
			<button
				type="submit"
				class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-xs font-medium text-red-400 hover:bg-red-900/30 transition"
			>
				<LogOut class="w-3.5 h-3.5" />
				Sign Out
			</button>
		</form>
	</div>

	<!-- Status / Message banner -->
	{#if form?.message}
		<div class="rounded-lg border {form?.success ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300' : 'border-red-500/20 bg-red-950/30 text-red-400'} p-3.5 text-xs">
			{form.message}
		</div>
	{/if}

	<!-- Section 1: User Profile & Role -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="md:col-span-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-base font-bold text-zinc-200">
					{data.user.name?.charAt(0).toUpperCase() || 'U'}
				</div>
				<div>
					<h3 class="text-sm font-semibold text-zinc-100">{data.user.name}</h3>
					<p class="text-xs text-zinc-400">{data.user.email}</p>
				</div>
			</div>

			<div class="pt-3 border-t border-zinc-800/80 space-y-2">
				<div class="flex items-center justify-between text-xs">
					<span class="text-zinc-500">Privilege Role</span>
					<span
						class="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold {data.user.role === 'admin'
							? 'bg-purple-950 text-purple-300 border border-purple-800/60'
							: data.user.role === 'trusted'
								? 'bg-sky-950 text-sky-300 border border-sky-800/60'
								: 'bg-zinc-800 text-zinc-300'}"
					>
						{data.user.role}
					</span>
				</div>
				<div class="flex items-center justify-between text-xs">
					<span class="text-zinc-500">Account ID</span>
					<span class="font-mono text-[10px] text-zinc-400 truncate max-w-[140px]">{data.user.id}</span>
				</div>
				<div class="flex items-center justify-between text-xs">
					<span class="text-zinc-500">Member Since</span>
					<span class="text-[11px] text-zinc-300">{formatDate(data.user.createdAt)}</span>
				</div>
			</div>
		</div>

		<!-- Edit Profile Form -->
		<div class="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
			<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-4 font-mono">
				Update Profile Information
			</h2>
			<form method="post" action="?/updateProfile" use:enhance class="space-y-4 max-w-lg">
				<div>
					<label for="profileName" class="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
					<input
						id="profileName"
						type="text"
						name="name"
						value={data.user.name}
						required
						class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
					/>
				</div>
				<div>
					<label for="profileEmail" class="block text-xs font-medium text-zinc-400 mb-1.5">Email address (Verified)</label>
					<input
						id="profileEmail"
						type="email"
						value={data.user.email}
						disabled
						class="w-full rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500 cursor-not-allowed font-mono"
					/>
				</div>
				<button
					type="submit"
					class="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition"
				>
					Save Changes
				</button>
			</form>
		</div>
	</div>

	<!-- Section 2: Active User Sessions -->
	<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
		<div class="flex items-center justify-between mb-4">
			<div>
				<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
					<Monitor class="w-4 h-4 text-zinc-400" />
					Active Logged-In Sessions
				</h2>
				<p class="text-[11px] text-zinc-500 mt-0.5">
					These devices currently have active session tokens for your account.
				</p>
			</div>
			<span class="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
				{data.sessions.length} active
			</span>
		</div>

		<div class="divide-y divide-zinc-800/80 border-t border-zinc-800">
			{#each data.sessions as sess (sess.id)}
				<div class="py-3.5 flex items-center justify-between text-xs">
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<span class="font-mono text-zinc-200">{sess.ipAddress}</span>
							{#if sess.isCurrent}
								<span class="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-[10px] font-medium">
									Current Device
								</span>
							{/if}
						</div>
						<div class="text-[11px] text-zinc-500 font-mono truncate max-w-lg">
							{sess.userAgent}
						</div>
						<div class="text-[10px] text-zinc-500 flex items-center gap-1">
							<Clock class="w-3 h-3" />
							Started {formatDate(sess.createdAt)} • Expires {formatDate(sess.expiresAt)}
						</div>
					</div>

					<div>
						<form method="post" action="?/revokeSession" use:enhance>
							<input type="hidden" name="sessionId" value={sess.id} />
							<button
								type="submit"
								class="px-2.5 py-1 rounded text-[11px] font-medium border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/40 hover:bg-red-950/20 transition"
							>
								{sess.isCurrent ? 'Log Out' : 'Revoke'}
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Section 3: VIP Invite Codes (Admin or Trusted only) -->
	{#if data.user.role === 'admin' || data.user.role === 'trusted'}
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-5">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-2">
						<Ticket class="w-4 h-4 text-amber-400" />
						VIP Invite Code Generator
					</h2>
					<p class="text-[11px] text-zinc-400 mt-0.5">
						Generate unique invite keys to grant new members access to this invite-only instance.
					</p>
				</div>
			</div>

			<!-- Generate Invite Form -->
			<form
				method="post"
				action="?/createInvite"
				use:enhance={() => {
					isGeneratingInvite = true;
					return async ({ update }) => {
						isGeneratingInvite = false;
						await update();
					};
				}}
				class="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-lg border border-zinc-800 bg-zinc-950"
			>
				<div>
					<label for="customCodeInput" class="block text-[11px] font-medium text-zinc-400 mb-1">Custom Code (Optional)</label>
					<input
						id="customCodeInput"
						type="text"
						name="customCode"
						placeholder="RUN-VIP-XXXX"
						class="w-full uppercase rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
					/>
				</div>
				<div>
					<label for="maxUsesInput" class="block text-[11px] font-medium text-zinc-400 mb-1">Max Uses</label>
					<input
						id="maxUsesInput"
						type="number"
						name="maxUses"
						min="1"
						max="1000"
						value="1"
						class="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none font-mono"
					/>
				</div>
				<div>
					<label for="roleInput" class="block text-[11px] font-medium text-zinc-400 mb-1">Grant Role</label>
					<select
						id="roleInput"
						name="role"
						class="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none font-mono"
					>
						<option value="member">Member</option>
						<option value="trusted">Trusted (Webhooks enabled)</option>
						{#if data.user.role === 'admin'}
							<option value="admin">Administrator</option>
						{/if}
					</select>
				</div>
				<div class="flex items-end">
					<button
						type="submit"
						disabled={isGeneratingInvite}
						class="w-full py-1.5 px-3 rounded-md bg-amber-400 text-zinc-950 text-xs font-semibold hover:bg-amber-300 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
					>
						<Plus class="w-3.5 h-3.5" />
						Create Key
					</button>
				</div>
			</form>

			<!-- Generated Invites Table -->
			{#if data.invites.length > 0}
				<div class="border border-zinc-800 rounded-lg overflow-hidden">
					<table class="w-full text-left text-xs">
						<thead class="bg-zinc-950 text-zinc-500 border-b border-zinc-800 font-mono text-[11px]">
							<tr>
								<th class="p-3">Invite Code</th>
								<th class="p-3">Role Granted</th>
								<th class="p-3">Redemptions</th>
								<th class="p-3">Status</th>
								<th class="p-3 text-right">Direct Link</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-800/60 bg-zinc-900/40 font-mono">
							{#each data.invites as inv (inv.id)}
								<tr class="hover:bg-zinc-800/30 transition">
									<td class="p-3 font-bold text-zinc-200">
										{inv.code}
									</td>
									<td class="p-3">
										<span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold {inv.role === 'admin'
											? 'bg-purple-950 text-purple-300'
											: inv.role === 'trusted'
												? 'bg-sky-950 text-sky-300'
												: 'bg-zinc-800 text-zinc-300'}">
											{inv.role}
										</span>
									</td>
									<td class="p-3 text-zinc-400">
										{inv.usedCount} / {inv.maxUses}
									</td>
									<td class="p-3">
										{#if inv.isActive && inv.usedCount < inv.maxUses}
											<span class="text-emerald-400 text-[11px]">Active</span>
										{:else}
											<span class="text-zinc-500 text-[11px]">Depleted</span>
										{/if}
									</td>
									<td class="p-3 text-right">
										<button
											type="button"
											onclick={() => copyToClipboard(`${window.location.origin}/invite/${inv.code}`, inv.id)}
											class="inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[11px] text-zinc-300 transition"
										>
											{#if copiedCode === inv.id}
												<Check class="w-3 h-3 text-emerald-400" />
												<span class="text-emerald-400">Copied</span>
											{:else}
												<Copy class="w-3 h-3 text-zinc-500" />
												<span>Copy Invite URL</span>
											{/if}
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>
