<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import {
		Webhook as WebhookIcon,
		Plus,
		Trash2,
		Send,
		ShieldAlert,
		CheckCircle2,
		XCircle,
		ExternalLink,
		Sliders,
		Sparkles
	} from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let showAddModal = $state(false);
	let targetUrl = $state('');
	let isDiscordDetected = $derived(
		targetUrl.includes('discord.com/api/webhooks') || targetUrl.includes('discordapp.com/api/webhooks')
	);

	let discordUsername = $state('Run Link Engine');
	let discordAvatarUrl = $state('https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.png');
	let discordColor = $state('#10b981');

	let isSubmitting = $state(false);
	let isTesting = $state<string | null>(null);

	function formatDate(val: string | number | Date | null | undefined): string {
		if (!val) return 'Never';
		return new Date(val).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Outgoing Webhooks & Discord Embeds — Run</title>
</svelte:head>

<div class="space-y-6 max-w-6xl mx-auto">
	<!-- Top Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
		<div>
			<div class="flex items-center gap-2">
				<span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold">
					Event Streams
				</span>
				<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
					<WebhookIcon class="w-5 h-5 text-emerald-400" />
					Outgoing Webhooks & Integrations
				</h1>
			</div>
			<p class="text-xs text-zinc-400 mt-1">
				Dispatch real-time telemetry payloads on click events, link creations, and security gate violations
			</p>
		</div>

		{#if data.authorized}
			<button
				type="button"
				onclick={() => (showAddModal = !showAddModal)}
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition"
			>
				<Plus class="w-3.5 h-3.5" />
				{showAddModal ? 'Close Form' : 'Register Webhook'}
			</button>
		{/if}
	</div>

	<!-- Status Banner -->
	{#if form?.message}
		<div class="rounded-lg border {form?.success ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300' : 'border-red-500/20 bg-red-950/30 text-red-400'} p-3.5 text-xs flex items-center gap-2">
			<span>{form.message}</span>
		</div>
	{/if}

	{#if !data.authorized}
		<!-- Unauthorized Gate -->
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center max-w-md mx-auto space-y-3">
			<ShieldAlert class="w-10 h-10 text-amber-400 mx-auto" />
			<h2 class="text-sm font-bold text-zinc-200">Restricted Integration Feature</h2>
			<p class="text-xs text-zinc-400">
				Outgoing webhooks and Discord integrations are available exclusively to users with <strong class="text-zinc-200">Trusted</strong> or <strong class="text-purple-300">Admin</strong> privileges.
			</p>
			<div class="pt-2">
				<a
					href="/account"
					class="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white underline underline-offset-4"
				>
					View Account Privileges &rarr;
				</a>
			</div>
		</div>
	{:else}
		<!-- Registration Form / Modal -->
		{#if showAddModal}
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-5">
				<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
					<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center gap-2">
						<Sliders class="w-4 h-4 text-zinc-400" />
						New Webhook Endpoint
					</h3>
					{#if isDiscordDetected}
						<span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
							<Sparkles class="w-3 h-3" />
							Discord Webhook Detected
						</span>
					{/if}
				</div>

				<form
					method="post"
					action="?/create"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							isSubmitting = false;
							await update();
							showAddModal = false;
						};
					}}
					class="space-y-4"
				>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="webhookNameInput" class="block text-[11px] font-medium text-zinc-400 mb-1">Friendly Name</label>
							<input
								id="webhookNameInput"
								type="text"
								name="name"
								required
								placeholder="e.g. Discord #link-telemetry"
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
							/>
						</div>

						<div>
							<label for="webhookUrlInput" class="block text-[11px] font-medium text-zinc-400 mb-1">Endpoint URL</label>
							<input
								id="webhookUrlInput"
								type="url"
								name="url"
								required
								bind:value={targetUrl}
								placeholder="https://discord.com/api/webhooks/... or https://api.mycorp.com/hooks"
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
							/>
						</div>
					</div>

					<!-- Event Subscriptions -->
					<div>
						<span class="block text-[11px] font-medium text-zinc-400 mb-2">Subscribed Event Triggers</span>
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<label class="flex items-center gap-2 p-2 rounded-md border border-zinc-800 bg-zinc-950 text-xs text-zinc-300 cursor-pointer">
								<input type="checkbox" name="evt_clicked" value="true" checked class="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0" />
								<div>
									<div class="font-medium">link.clicked</div>
									<div class="text-[10px] text-zinc-500">Every link visit & edge redirect</div>
								</div>
							</label>

							<label class="flex items-center gap-2 p-2 rounded-md border border-zinc-800 bg-zinc-950 text-xs text-zinc-300 cursor-pointer">
								<input type="checkbox" name="evt_created" value="true" checked class="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0" />
								<div>
									<div class="font-medium">link.created</div>
									<div class="text-[10px] text-zinc-500">New short link registered</div>
								</div>
							</label>

							<label class="flex items-center gap-2 p-2 rounded-md border border-zinc-800 bg-zinc-950 text-xs text-zinc-300 cursor-pointer">
								<input type="checkbox" name="evt_security" value="true" checked class="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0" />
								<div>
									<div class="font-medium">security.blocked</div>
									<div class="text-[10px] text-zinc-500">Password/Age gate rejected</div>
								</div>
							</label>
						</div>
					</div>

					<!-- Discord Embed Customizer Panel -->
					{#if isDiscordDetected}
						<div class="rounded-lg border border-indigo-900/60 bg-indigo-950/20 p-4 space-y-4">
							<div class="flex items-center justify-between">
								<div class="text-xs font-bold font-mono text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
									<Sparkles class="w-3.5 h-3.5 text-indigo-400" />
									Discord Embed Customization
								</div>
								<span class="text-[10px] font-mono text-indigo-400">Live Preview Enabled</span>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div>
									<label for="discordBotName" class="block text-[10px] font-medium text-zinc-400 mb-1">Bot Name</label>
									<input
										id="discordBotName"
										type="text"
										name="discordUsername"
										bind:value={discordUsername}
										class="w-full rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-100 font-mono focus:outline-none"
									/>
								</div>
								<div>
									<label for="discordAvatar" class="block text-[10px] font-medium text-zinc-400 mb-1">Avatar Image URL</label>
									<input
										id="discordAvatar"
										type="url"
										name="discordAvatarUrl"
										bind:value={discordAvatarUrl}
										class="w-full rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-100 font-mono focus:outline-none"
									/>
								</div>
								<div>
									<label for="discordAccent" class="block text-[10px] font-medium text-zinc-400 mb-1">Accent Hex Color</label>
									<div class="flex items-center gap-2">
										<input
											id="discordAccent"
											type="color"
											name="discordColor"
											bind:value={discordColor}
											class="w-8 h-7 rounded border border-zinc-800 bg-zinc-950 cursor-pointer p-0.5"
										/>
										<input
											type="text"
											bind:value={discordColor}
											class="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-100 font-mono focus:outline-none uppercase"
										/>
									</div>
								</div>
							</div>

							<!-- Discord Preview Simulator -->
							<div class="mt-3 p-3.5 rounded-lg bg-[#2b2d31] border border-[#1e1f22] text-white font-sans max-w-lg">
								<div class="flex items-center gap-2 mb-2">
									<img src={discordAvatarUrl} alt="Avatar" class="w-6 h-6 rounded-full bg-zinc-800 object-cover" />
									<span class="text-xs font-semibold text-white">{discordUsername}</span>
									<span class="text-[9px] uppercase px-1 py-0.2 rounded bg-[#5865f2] text-white font-bold">BOT</span>
									<span class="text-[10px] text-zinc-400">Today at 12:00 PM</span>
								</div>

								<div class="pl-2 border-l-4 rounded-sm bg-[#1e1f22] p-2.5" style="border-color: {discordColor}">
									<div class="text-xs font-bold text-white mb-1">🔗 Link Navigated: /launch</div>
									<div class="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
										<div><span class="text-zinc-500 block text-[9px] uppercase font-bold">Slug</span> <code>/launch</code></div>
										<div><span class="text-zinc-500 block text-[9px] uppercase font-bold">Location</span> San Francisco, US</div>
										<div class="col-span-2"><span class="text-zinc-500 block text-[9px] uppercase font-bold">Target URL</span> https://example.com/product</div>
									</div>
									<div class="mt-2 text-[9px] text-zinc-500 flex items-center justify-between border-t border-zinc-800 pt-1">
										<span>Run Link Engine</span>
										<span>Today at 12:00 PM</span>
									</div>
								</div>
							</div>
						</div>
					{:else}
						<!-- Standard Webhook Secret -->
						<div>
							<label for="webhookSecretInput" class="block text-[11px] font-medium text-zinc-400 mb-1">Secret Key (HMAC-SHA256 signature)</label>
							<input
								id="webhookSecretInput"
								type="password"
								name="secret"
								placeholder="whsec_••••••••••••"
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
							/>
							<p class="text-[10px] text-zinc-500 mt-1">
								Sent in the <code>X-Run-Signature</code> header so your application can verify authenticity.
							</p>
						</div>
					{/if}

					<div class="flex items-center justify-end gap-2 pt-2">
						<button
							type="button"
							onclick={() => (showAddModal = false)}
							class="px-3 py-1.5 rounded-md border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							class="px-4 py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition disabled:opacity-50"
						>
							{isSubmitting ? 'Registering...' : 'Save Webhook'}
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Webhooks List Table -->
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
			{#if data.webhooks.length === 0}
				<div class="p-8 text-center space-y-2">
					<WebhookIcon class="w-8 h-8 text-zinc-600 mx-auto" />
					<p class="text-xs font-medium text-zinc-300">No outgoing webhooks configured</p>
					<p class="text-[11px] text-zinc-500 max-w-sm mx-auto">
						Register a webhook or Discord endpoint to receive real-time telemetry when your links are visited.
					</p>
				</div>
			{:else}
				<table class="w-full text-left text-xs">
					<thead class="bg-zinc-950 text-zinc-500 border-b border-zinc-800 font-mono text-[11px]">
						<tr>
							<th class="p-3">Integration Name</th>
							<th class="p-3">Type</th>
							<th class="p-3">Target Endpoint</th>
							<th class="p-3">Events</th>
							<th class="p-3">Last Fired</th>
							<th class="p-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-800/60 bg-zinc-900/40 font-mono">
						{#each data.webhooks as hook (hook.id)}
							<tr class="hover:bg-zinc-800/30 transition">
								<td class="p-3">
									<div class="font-bold text-zinc-200 font-sans text-xs">{hook.name}</div>
									<div class="text-[10px] text-zinc-500 font-mono">ID: {hook.id.slice(0, 8)}</div>
								</td>
								<td class="p-3">
									{#if hook.isDiscord}
										<span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
											Discord Embed
										</span>
									{:else}
										<span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300">
											HTTP JSON
										</span>
									{/if}
								</td>
								<td class="p-3 text-zinc-400 text-[11px] max-w-xs truncate">
									{hook.url}
								</td>
								<td class="p-3 text-zinc-300 text-[10px]">
									{hook.events}
								</td>
								<td class="p-3 text-zinc-500 text-[11px] whitespace-nowrap">
									{formatDate(hook.lastTriggeredAt)}
								</td>
								<td class="p-3 text-right space-x-1 whitespace-nowrap">
									<form
										method="post"
										action="?/test"
										use:enhance={() => {
											isTesting = hook.id;
											return async ({ update }) => {
												isTesting = null;
												await update();
											};
										}}
										class="inline"
									>
										<input type="hidden" name="webhookId" value={hook.id} />
										<button
											type="submit"
											disabled={isTesting === hook.id}
											class="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[11px] text-zinc-300 transition disabled:opacity-50"
										>
											<Send class="w-3 h-3 text-emerald-400" />
											<span>{isTesting === hook.id ? 'Sending...' : 'Test Ping'}</span>
										</button>
									</form>

									<form method="post" action="?/toggle" use:enhance class="inline">
										<input type="hidden" name="webhookId" value={hook.id} />
										<button
											type="submit"
											class="px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[11px] {hook.isActive ? 'text-emerald-400' : 'text-zinc-500'} transition"
										>
											{hook.isActive ? 'Active' : 'Disabled'}
										</button>
									</form>

									<form method="post" action="?/delete" use:enhance class="inline">
										<input type="hidden" name="webhookId" value={hook.id} />
										<button
											type="submit"
											class="px-2 py-1 rounded border border-zinc-800 hover:border-red-900/40 bg-zinc-950 text-[11px] text-red-400 transition"
										>
											<Trash2 class="w-3 h-3 inline" />
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
</div>
