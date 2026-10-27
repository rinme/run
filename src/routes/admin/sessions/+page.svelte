<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import {
		Monitor,
		Shield,
		LogOut,
		AlertTriangle
	} from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

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
	<title>Active Sessions — Run Admin</title>
</svelte:head>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<Monitor class="w-5 h-5 text-purple-400" />
				<span>Global Active Sessions</span>
				<span class="text-xs font-mono font-normal text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded-full border border-zinc-750">
					{data.sessions.length} active
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">
				Live authenticated bearer and cookie sessions active across the entire platform.
			</p>
		</div>

		{#if data.sessions.length > 1}
			<form method="post" action="?/revokeAllOtherSessions" use:enhance>
				<button
					type="submit"
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-xs font-medium text-red-400 hover:bg-red-900/30 transition cursor-pointer"
				>
					<AlertTriangle class="w-3.5 h-3.5" />
					<span>Revoke All Other Sessions</span>
				</button>
			</form>
		{/if}
	</div>

	<!-- Status Message -->
	{#if form?.message}
		<div class="rounded-lg border {form?.success ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300' : 'border-red-500/20 bg-red-950/30 text-red-400'} p-3.5 text-xs flex items-center gap-2">
			<span class="font-bold">{form?.success ? 'Success:' : 'Notice:'}</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- Sessions Table -->
	<div class="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="bg-zinc-950/80 text-zinc-500 border-b border-zinc-800 font-mono text-[10px] uppercase">
					<tr>
						<th class="p-3">User</th>
						<th class="p-3">IP Address</th>
						<th class="p-3">Client / Browser</th>
						<th class="p-3">Logged In</th>
						<th class="p-3">Expires</th>
						<th class="p-3 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-800/60">
					{#if data.sessions.length === 0}
						<tr>
							<td colspan="6" class="p-6 text-center text-zinc-500">
								No active sessions found.
							</td>
						</tr>
					{/if}

					{#each data.sessions as s (s.id)}
						<tr class="hover:bg-zinc-800/30 transition">
							<td class="p-3">
								<div class="font-medium text-zinc-200">{s.userName || 'Anonymous'}</div>
								<div class="text-[11px] text-zinc-500 font-mono">{s.userEmail || s.userId}</div>
							</td>
							<td class="p-3 font-mono text-zinc-300">
								<div class="flex items-center gap-1.5">
									<span>{s.ipAddress || '—'}</span>
									{#if s.isCurrent}
										<span class="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[9px] font-sans">
											You
										</span>
									{/if}
								</div>
							</td>
							<td class="p-3 text-zinc-400 font-mono text-[11px] max-w-xs truncate" title={s.userAgent || ''}>
								{s.userAgent || 'Unknown Device'}
							</td>
							<td class="p-3 text-zinc-400 font-mono text-[11px]">
								{formatDate(s.createdAt)}
							</td>
							<td class="p-3 text-zinc-400 font-mono text-[11px]">
								{formatDate(s.expiresAt)}
							</td>
							<td class="p-3 text-right">
								<form method="post" action="?/revokeSession" use:enhance class="inline">
									<input type="hidden" name="sessionId" value={s.id} />
									<button
										type="submit"
										class="px-2 py-1 rounded border border-zinc-800 hover:border-red-900/40 bg-zinc-950 text-[11px] text-zinc-400 hover:text-red-400 transition cursor-pointer"
									>
										{s.isCurrent ? 'Log Out' : 'Revoke'}
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
