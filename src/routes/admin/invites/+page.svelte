<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import {
		Ticket,
		Plus,
		Mail,
		Copy,
		Check,
		Trash2,
		X,
		Send
	} from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let copiedId = $state<string | null>(null);
	let emailModalInvite = $state<any | null>(null);
	let emailRecipient = $state('');
	let isSubmitting = $state(false);

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedId = id;
		setTimeout(() => {
			if (copiedId === id) copiedId = null;
		}, 2000);
	}
</script>

<svelte:head>
	<title>VIP Invite Codes — Run Admin</title>
</svelte:head>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<Ticket class="w-5 h-5 text-amber-400" />
				<span>VIP Invite Authority</span>
				<span class="text-xs font-mono font-normal text-zinc-400 bg-zinc-850 px-2 py-0.5 rounded-full border border-zinc-750">
					{data.invites.length} codes
				</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">
				Generate VIP access codes and govern redemptions for this invite-only instance.
			</p>
		</div>
	</div>

	<!-- Status Message -->
	{#if form?.message}
		<div class="rounded-lg border {form?.success ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300' : 'border-red-500/20 bg-red-950/30 text-red-400'} p-3.5 text-xs flex items-center gap-2">
			<span class="font-bold">{form?.success ? 'Success:' : 'Notice:'}</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-5">
		<!-- Create Invite Form -->
		<form
			method="post"
			use:enhance
			class="space-y-3 p-4 rounded-lg border border-zinc-800 bg-zinc-950"
		>
			<div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
				<div>
					<label for="adminCustomCode" class="block text-[11px] font-medium text-zinc-400 mb-1">Code Name (Optional)</label>
					<input
						id="adminCustomCode"
						type="text"
						name="code"
						placeholder="RUN-VIP-XXXX"
						class="w-full uppercase rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
					/>
				</div>
				<div>
					<label for="adminMaxUses" class="block text-[11px] font-medium text-zinc-400 mb-1">Max Usages</label>
					<input
						id="adminMaxUses"
						type="number"
						name="maxUses"
						min="1"
						max="10000"
						value="1"
						class="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none font-mono"
					/>
				</div>
				<div>
					<label for="adminGrantRole" class="block text-[11px] font-medium text-zinc-400 mb-1">Role Assigned</label>
					<select
						id="adminGrantRole"
						name="role"
						class="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none font-mono"
					>
						<option value="member">Member</option>
						<option value="trusted">Trusted (Webhooks)</option>
						<option value="admin">Administrator</option>
					</select>
				</div>
				<div>
					<label for="adminRecipientEmail" class="block text-[11px] font-medium text-zinc-400 mb-1">Direct Recipient Email</label>
					<input
						id="adminRecipientEmail"
						type="email"
						name="recipientEmail"
						placeholder="user@example.com (optional)"
						class="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
					/>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
				<button
					type="submit"
					formaction="?/createInvite"
					class="py-1.5 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
				>
					<Plus class="w-3.5 h-3.5" />
					Create Code Only
				</button>
				<button
					type="submit"
					formaction="?/createAndEmailInvite"
					class="py-1.5 px-3 rounded-md bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
				>
					<Mail class="w-3.5 h-3.5" />
					Create &amp; Send Email
				</button>
			</div>
		</form>

		<!-- Invites List -->
		<div class="border border-zinc-800 rounded-lg overflow-hidden">
			<table class="w-full text-left text-xs">
				<thead class="bg-zinc-950 text-zinc-500 border-b border-zinc-800 font-mono text-[11px]">
					<tr>
						<th class="p-3">Invite Code</th>
						<th class="p-3">Role</th>
						<th class="p-3">Uses / Max</th>
						<th class="p-3">State</th>
						<th class="p-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-800/60 bg-zinc-900/40 font-mono">
					{#if data.invites.length === 0}
						<tr>
							<td colspan="5" class="p-6 text-center text-zinc-500">
								No invite codes generated yet.
							</td>
						</tr>
					{/if}

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
							<td class="p-3 text-right space-x-1">
								<button
									type="button"
									onclick={() => { emailModalInvite = inv; emailRecipient = ''; }}
									class="inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-amber-500/40 bg-zinc-950 text-[11px] text-amber-300 transition cursor-pointer"
									title="Dispatch invite code via email"
								>
									<Mail class="w-3 h-3 text-amber-400" />
									<span>Email</span>
								</button>

								<button
									type="button"
									onclick={() => copyToClipboard(`${window.location.origin}/invite/${inv.code}`, inv.id)}
									class="inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[11px] text-zinc-300 transition cursor-pointer"
								>
									{#if copiedId === inv.id}
										<Check class="w-3 h-3 text-emerald-400" />
									{:else}
										<Copy class="w-3 h-3 text-zinc-500" />
									{/if}
									<span>Copy URL</span>
								</button>

								<form method="post" action="?/toggleInvite" use:enhance class="inline">
									<input type="hidden" name="inviteId" value={inv.id} />
									<button
										type="submit"
										class="px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[11px] text-zinc-400 transition cursor-pointer"
									>
										{inv.isActive ? 'Disable' : 'Enable'}
									</button>
								</form>

								<form method="post" action="?/deleteInvite" use:enhance class="inline">
									<input type="hidden" name="inviteId" value={inv.id} />
									<button
										type="submit"
										class="px-2 py-1 rounded border border-zinc-800 hover:border-red-900/40 bg-zinc-950 text-[11px] text-red-400 transition cursor-pointer"
									>
										<Trash2 class="w-3 h-3 inline" />
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

<!-- Direct Email Dispatch Modal -->
{#if emailModalInvite}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
		<div class="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
			<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
				<div class="flex items-center gap-2">
					<Mail class="w-4 h-4 text-amber-400" />
					<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
						Send VIP Email Invitation
					</h3>
				</div>
				<button
					type="button"
					onclick={() => (emailModalInvite = null)}
					class="p-1 text-zinc-500 hover:text-white"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<p class="text-xs text-zinc-400 leading-relaxed">
				Dispatch an exclusive invitation for code <strong class="text-amber-300 font-mono">{emailModalInvite.code}</strong>.
			</p>

			<form
				method="post"
				action="?/sendInviteEmail"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						emailModalInvite = null;
						await update();
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="inviteId" value={emailModalInvite.id} />

				<div>
					<label for="modalRecipientEmail" class="block text-[11px] font-medium text-zinc-400 mb-1">
						Recipient Email
					</label>
					<input
						id="modalRecipientEmail"
						type="email"
						name="recipientEmail"
						bind:value={emailRecipient}
						required
						placeholder="colleague@domain.com"
						class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
					/>
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-zinc-800">
					<button
						type="button"
						onclick={() => (emailModalInvite = null)}
						class="px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting || !emailRecipient}
						class="px-3 py-1.5 rounded-md bg-amber-400 text-zinc-950 text-xs font-semibold hover:bg-amber-300 transition disabled:opacity-50 flex items-center gap-1.5"
					>
						<Send class="w-3.5 h-3.5" />
						<span>Dispatch Email</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
