<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import {
		Settings,
		Shield,
		Monitor,
		Ticket,
		Mail,
		Sliders,
		Plus,
		Trash2,
		Copy,
		Check,
		AlertTriangle,
		LogOut,
		Save,
		RefreshCw,
		Globe,
		Server,
		Activity
	} from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let activeTab = $state<'config' | 'sessions' | 'invites' | 'overview'>('config');
	let copiedId = $state<string | null>(null);

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedId = id;
		setTimeout(() => {
			if (copiedId === id) copiedId = null;
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
	<title>Admin System Control — Run</title>
</svelte:head>

<div class="space-y-6 max-w-6xl mx-auto">
	<!-- Top Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
		<div>
			<div class="flex items-center gap-2">
				<span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-950 text-purple-300 border border-purple-800/60 font-bold">
					Super Admin
				</span>
				<h1 class="text-xl font-bold tracking-tight text-zinc-100">System Dashboard & Configuration</h1>
			</div>
			<p class="text-xs text-zinc-400 mt-1">
				Authoritative control for registration modes, email transports, active sessions, and global feature flags
			</p>
		</div>

		<!-- Tab Navigation Buttons -->
		<div class="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800 self-start">
			<button
				type="button"
				onclick={() => (activeTab = 'config')}
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition {activeTab === 'config'
					? 'bg-zinc-800 text-zinc-100 shadow-sm'
					: 'text-zinc-400 hover:text-zinc-200'}"
			>
				<Sliders class="w-3.5 h-3.5" />
				Settings
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'sessions')}
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition {activeTab === 'sessions'
					? 'bg-zinc-800 text-zinc-100 shadow-sm'
					: 'text-zinc-400 hover:text-zinc-200'}"
			>
				<Monitor class="w-3.5 h-3.5" />
				Sessions ({data.stats.sessions})
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'invites')}
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition {activeTab === 'invites'
					? 'bg-zinc-800 text-zinc-100 shadow-sm'
					: 'text-zinc-400 hover:text-zinc-200'}"
			>
				<Ticket class="w-3.5 h-3.5" />
				Invites ({data.stats.invites})
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'overview')}
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition {activeTab === 'overview'
					? 'bg-zinc-800 text-zinc-100 shadow-sm'
					: 'text-zinc-400 hover:text-zinc-200'}"
			>
				<Activity class="w-3.5 h-3.5" />
				Telemetry
			</button>
		</div>
	</div>

	<!-- Status Message -->
	{#if form?.message}
		<div class="rounded-lg border {form?.success ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300' : 'border-red-500/20 bg-red-950/30 text-red-400'} p-3.5 text-xs flex items-center gap-2">
			<span class="font-bold">{form?.success ? 'Success:' : 'Notice:'}</span>
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- TAB 1: SYSTEM CONFIGURATION -->
	{#if activeTab === 'config'}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- 1. General & Routing Settings -->
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
				<div class="flex items-center gap-2 border-b border-zinc-800 pb-3">
					<Globe class="w-4 h-4 text-zinc-400" />
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">General & Branding</h2>
				</div>

				<form method="post" action="?/updateGeneral" use:enhance class="space-y-3.5">
					<div>
						<label for="cfgSiteTitle" class="block text-[11px] font-medium text-zinc-400 mb-1">Site Title</label>
						<input
							id="cfgSiteTitle"
							type="text"
							name="siteTitle"
							value={data.settings.general.siteTitle}
							required
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
						/>
					</div>

					<div>
						<label for="cfgSiteTagline" class="block text-[11px] font-medium text-zinc-400 mb-1">Tagline</label>
						<input
							id="cfgSiteTagline"
							type="text"
							name="siteTagline"
							value={data.settings.general.siteTagline}
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="cfgDefaultDomain" class="block text-[11px] font-medium text-zinc-400 mb-1">Default Domain</label>
							<input
								id="cfgDefaultDomain"
								type="text"
								name="defaultDomain"
								value={data.settings.general.defaultDomain}
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
							/>
						</div>
						<div>
							<label for="cfgDefaultDelivery" class="block text-[11px] font-medium text-zinc-400 mb-1">Default Delivery Mode</label>
							<select
								id="cfgDefaultDelivery"
								name="defaultDeliveryMode"
								value={data.settings.general.defaultDeliveryMode}
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
							>
								<option value="direct">Direct 302</option>
								<option value="cloaked">Cloaked (Iframe)</option>
								<option value="password">Password Challenge</option>
								<option value="age_gate">Age Verification Gate</option>
								<option value="interstitial">Countdown Interstitial</option>
								<option value="reverse_proxy">Reverse Proxy</option>
							</select>
						</div>
					</div>

					<div>
						<label for="cfgSiteUrl" class="block text-[11px] font-medium text-zinc-400 mb-1">Base Instance URL</label>
						<input
							id="cfgSiteUrl"
							type="text"
							name="siteUrl"
							value={data.settings.general.siteUrl}
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
						/>
					</div>

					<button
						type="submit"
						class="w-full py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition flex items-center justify-center gap-1.5"
					>
						<Save class="w-3.5 h-3.5" />
						Save General Settings
					</button>
				</form>
			</div>

			<!-- 2. Registration & Auth Policies -->
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
				<div class="flex items-center gap-2 border-b border-zinc-800 pb-3">
					<Shield class="w-4 h-4 text-amber-400" />
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">Registration Policies</h2>
				</div>

				<form method="post" action="?/updateAuth" use:enhance class="space-y-4">
					<div>
						<label for="cfgRegMode" class="block text-[11px] font-medium text-zinc-400 mb-1">Registration Gate Mode</label>
						<select
							id="cfgRegMode"
							name="registrationMode"
							value={data.settings.auth.registrationMode}
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
						>
							<option value="invite_only">Invite Only (Codes or Email Invites Required)</option>
							<option value="public">Open Public Registration</option>
							<option value="closed">Closed (No new signups allowed)</option>
						</select>
						<p class="text-[10px] text-zinc-500 mt-1">
							Currently set to <span class="font-mono text-amber-300 uppercase">{data.settings.auth.registrationMode}</span>.
						</p>
					</div>

					<div class="space-y-2 pt-2 border-t border-zinc-800/80">
						<label class="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
							<input
								type="checkbox"
								name="allowUserInviteCreation"
								value="true"
								checked={data.settings.auth.allowUserInviteCreation}
								class="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-0"
							/>
							<span>Allow Trusted users to generate invite codes</span>
						</label>

						<label class="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
							<input
								type="checkbox"
								name="requireEmailVerification"
								value="true"
								checked={data.settings.auth.requireEmailVerification}
								class="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-0"
							/>
							<span>Enforce mandatory email verification before link creation</span>
						</label>
					</div>

					<button
						type="submit"
						class="w-full py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition flex items-center justify-center gap-1.5"
					>
						<Save class="w-3.5 h-3.5" />
						Update Auth Policies
					</button>
				</form>
			</div>

			<!-- 3. Email & SMTP Transport -->
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
				<div class="flex items-center gap-2 border-b border-zinc-800 pb-3">
					<Mail class="w-4 h-4 text-sky-400" />
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">Email & SMTP Transport</h2>
				</div>

				<form method="post" action="?/updateEmail" use:enhance class="space-y-3">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="cfgEmailProvider" class="block text-[11px] font-medium text-zinc-400 mb-1">Provider Engine</label>
							<select
								id="cfgEmailProvider"
								name="provider"
								value={data.settings.email.provider}
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
							>
								<option value="console">Console (Dev / Mock)</option>
								<option value="smtp">Custom SMTP Server</option>
								<option value="resend">Resend API</option>
							</select>
						</div>
						<div>
							<label for="cfgFromEmail" class="block text-[11px] font-medium text-zinc-400 mb-1">Sender Email</label>
							<input
								id="cfgFromEmail"
								type="email"
								name="fromEmail"
								value={data.settings.email.fromEmail}
								required
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-3 gap-3">
						<div class="col-span-2">
							<label for="cfgSmtpHost" class="block text-[11px] font-medium text-zinc-400 mb-1">SMTP Host</label>
							<input
								id="cfgSmtpHost"
								type="text"
								name="smtpHost"
								value={data.settings.email.smtpHost}
								placeholder="smtp.mailgun.org"
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
							/>
						</div>
						<div>
							<label for="cfgSmtpPort" class="block text-[11px] font-medium text-zinc-400 mb-1">Port</label>
							<input
								id="cfgSmtpPort"
								type="number"
								name="smtpPort"
								value={data.settings.email.smtpPort}
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="cfgSmtpUser" class="block text-[11px] font-medium text-zinc-400 mb-1">SMTP Username</label>
							<input
								id="cfgSmtpUser"
								type="text"
								name="smtpUser"
								value={data.settings.email.smtpUser}
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
							/>
						</div>
						<div>
							<label for="cfgSmtpPass" class="block text-[11px] font-medium text-zinc-400 mb-1">SMTP Password</label>
							<input
								id="cfgSmtpPass"
								type="password"
								name="smtpPass"
								value={data.settings.email.smtpPass}
								placeholder="••••••••••••"
								class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
							/>
						</div>
					</div>

					<div>
						<label for="cfgResendApiKey" class="block text-[11px] font-medium text-zinc-400 mb-1">Resend API Key (Optional)</label>
						<input
							id="cfgResendApiKey"
							type="password"
							name="resendApiKey"
							value={data.settings.email.resendApiKey}
							placeholder="re_••••••••••••"
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
						/>
					</div>

					<button
						type="submit"
						class="w-full py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition flex items-center justify-center gap-1.5"
					>
						<Save class="w-3.5 h-3.5" />
						Save Email Settings
					</button>
				</form>
			</div>

			<!-- 4. Feature Toggles & Changelog Source -->
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
				<div class="flex items-center gap-2 border-b border-zinc-800 pb-3">
					<Server class="w-4 h-4 text-emerald-400" />
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">Feature Flags & Changelog</h2>
				</div>

				<form method="post" action="?/updateFeatures" use:enhance class="space-y-4">
					<div>
						<label for="cfgChangelogRepo" class="block text-[11px] font-medium text-zinc-400 mb-1">
							GitHub Repository for Releases & Changelog
						</label>
						<input
							id="cfgChangelogRepo"
							type="text"
							name="changelogRepo"
							value={data.settings.features.changelogRepo}
							placeholder="owner/repo (e.g. rinme/run)"
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
						/>
						<p class="text-[10px] text-zinc-500 mt-1">
							Releases are pulled from <span class="text-zinc-300 font-mono">api.github.com/repos/{data.settings.features.changelogRepo}/releases</span>.
						</p>
					</div>

					<div class="space-y-2 pt-2 border-t border-zinc-800/80">
						<label class="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
							<input
								type="checkbox"
								name="enableWebhooks"
								value="true"
								checked={data.settings.features.enableWebhooks}
								class="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0"
							/>
							<span>Enable Outgoing Webhooks & Discord Integration</span>
						</label>

						<label class="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
							<input
								type="checkbox"
								name="enableMcpServer"
								value="true"
								checked={data.settings.features.enableMcpServer}
								class="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0"
							/>
							<span>Enable Native Model Context Protocol (MCP) at <code>/api/mcp</code></span>
						</label>

						<label class="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
							<input
								type="checkbox"
								name="enableAiSuggestions"
								value="true"
								checked={data.settings.features.enableAiSuggestions}
								class="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0"
							/>
							<span>Enable AI Slug & Metadata Generation</span>
						</label>

						<label class="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
							<input
								type="checkbox"
								name="enable3dGlobe"
								value="true"
								checked={data.settings.features.enable3dGlobe}
								class="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0"
							/>
							<span>Enable 3D WebGL Globe on Analytics Dashboard</span>
						</label>
					</div>

					<button
						type="submit"
						class="w-full py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition flex items-center justify-center gap-1.5"
					>
						<Save class="w-3.5 h-3.5" />
						Save Feature Flags
					</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- TAB 2: ACTIVE SESSIONS MANAGER -->
	{#if activeTab === 'sessions'}
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
				<div>
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center gap-2">
						<Monitor class="w-4 h-4 text-zinc-400" />
						Global Active Sessions
					</h2>
					<p class="text-[11px] text-zinc-500 mt-0.5">
						Inspect and revoke authentication tokens across all user accounts in real time.
					</p>
				</div>
				<form method="post" action="?/revokeAllOtherSessions" use:enhance>
					<button
						type="submit"
						class="px-3 py-1.5 rounded-md border border-red-500/30 bg-red-950/20 text-xs text-red-400 hover:bg-red-900/30 transition flex items-center gap-1.5"
					>
						<AlertTriangle class="w-3.5 h-3.5" />
						Terminate All Other Sessions
					</button>
				</form>
			</div>

			<div class="border border-zinc-800 rounded-lg overflow-hidden">
				<table class="w-full text-left text-xs">
					<thead class="bg-zinc-950 text-zinc-500 border-b border-zinc-800 font-mono text-[11px]">
						<tr>
							<th class="p-3">User</th>
							<th class="p-3">IP Address</th>
							<th class="p-3">Client / Browser</th>
							<th class="p-3">Created</th>
							<th class="p-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-800/60 bg-zinc-900/40">
						{#each data.sessions as sess (sess.id)}
							<tr class="hover:bg-zinc-800/30 transition">
								<td class="p-3">
									<div class="font-medium text-zinc-200">{sess.userName || 'Unknown'}</div>
									<div class="text-[11px] text-zinc-500 font-mono">{sess.userEmail || sess.userId}</div>
								</td>
								<td class="p-3 font-mono text-zinc-300">
									<div class="flex items-center gap-2">
										<span>{sess.ipAddress || '127.0.0.1'}</span>
										{#if sess.isCurrent}
											<span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
												You
											</span>
										{/if}
									</div>
								</td>
								<td class="p-3 text-zinc-400 font-mono text-[11px] truncate max-w-xs">
									{sess.userAgent || '—'}
								</td>
								<td class="p-3 text-zinc-500 text-[11px] font-mono whitespace-nowrap">
									{formatDate(sess.createdAt)}
								</td>
								<td class="p-3 text-right">
									<form method="post" action="?/revokeSession" use:enhance>
										<input type="hidden" name="sessionId" value={sess.id} />
										<button
											type="submit"
											class="px-2.5 py-1 rounded text-[11px] font-medium border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/40 hover:bg-red-950/20 transition"
										>
											Revoke
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- TAB 3: INVITE CODES MANAGER -->
	{#if activeTab === 'invites'}
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-5">
			<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
				<div>
					<h2 class="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-2">
						<Ticket class="w-4 h-4 text-amber-400" />
						Invite Code Authority
					</h2>
					<p class="text-[11px] text-zinc-400 mt-0.5">
						Generate VIP access codes and govern redemptions for this invite-only instance.
					</p>
				</div>
			</div>

			<!-- Create Invite Form -->
			<form
				method="post"
				action="?/createInvite"
				use:enhance
				class="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-lg border border-zinc-800 bg-zinc-950"
			>
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
				<div class="flex items-end">
					<button
						type="submit"
						class="w-full py-1.5 px-3 rounded-md bg-amber-400 text-zinc-950 text-xs font-semibold hover:bg-amber-300 transition flex items-center justify-center gap-1.5"
					>
						<Plus class="w-3.5 h-3.5" />
						Create Invite Code
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
										onclick={() => copyToClipboard(`${window.location.origin}/invite/${inv.code}`, inv.id)}
										class="inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[11px] text-zinc-300 transition"
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
											class="px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[11px] text-zinc-400 transition"
										>
											{inv.isActive ? 'Disable' : 'Enable'}
										</button>
									</form>

									<form method="post" action="?/deleteInvite" use:enhance class="inline">
										<input type="hidden" name="inviteId" value={inv.id} />
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
			</div>
		</div>
	{/if}

	<!-- TAB 4: TELEMETRY OVERVIEW -->
	{#if activeTab === 'overview'}
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
				<div class="text-[11px] font-mono uppercase text-zinc-500">Users</div>
				<div class="text-2xl font-bold font-mono text-zinc-100 mt-1">{data.stats.users}</div>
				<div class="text-[10px] text-zinc-500 mt-1">Total registered accounts</div>
			</div>
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
				<div class="text-[11px] font-mono uppercase text-zinc-500">Links</div>
				<div class="text-2xl font-bold font-mono text-emerald-400 mt-1">{data.stats.links}</div>
				<div class="text-[10px] text-zinc-500 mt-1">Short links configured</div>
			</div>
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
				<div class="text-[11px] font-mono uppercase text-zinc-500">Sessions</div>
				<div class="text-2xl font-bold font-mono text-sky-400 mt-1">{data.stats.sessions}</div>
				<div class="text-[10px] text-zinc-500 mt-1">Active bearer sessions</div>
			</div>
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
				<div class="text-[11px] font-mono uppercase text-zinc-500">Invites</div>
				<div class="text-2xl font-bold font-mono text-amber-400 mt-1">{data.stats.invites}</div>
				<div class="text-[10px] text-zinc-500 mt-1">VIP registration keys</div>
			</div>
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
				<div class="text-[11px] font-mono uppercase text-zinc-500">Webhooks</div>
				<div class="text-2xl font-bold font-mono text-purple-400 mt-1">{data.stats.webhooks}</div>
				<div class="text-[10px] text-zinc-500 mt-1">Outgoing dispatch targets</div>
			</div>
		</div>
	{/if}
</div>
