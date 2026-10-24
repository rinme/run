<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
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
		Activity,
		Archive,
		Download,
		Upload,
		Lock,
		Unlock,
		FileJson,
		Eye,
		EyeOff,
		Send,
		CheckCircle2,
		X
	} from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let activeTab = $state<'config' | 'sessions' | 'invites' | 'overview' | 'backup'>('config');
	let copiedId = $state<string | null>(null);

	onMount(() => {
		if (window.location.hash === '#backup') {
			activeTab = 'backup';
		} else if (window.location.hash === '#invites') {
			activeTab = 'invites';
		} else if (window.location.hash === '#sessions') {
			activeTab = 'sessions';
		}
	});

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

	// --- BACKUP & RESTORE STATE ---
	let selectedDatasets = $state<Record<string, boolean>>({
		links: true,
		domains: true,
		utmTemplates: true,
		webhooks: true,
		siteSettings: true,
		inviteCodes: true
	});
	let exportPassphrase = $state('');
	let showExportPassphrase = $state(false);
	let isExporting = $state(false);
	let exportError = $state<string | null>(null);

	function selectAllDatasets(val: boolean) {
		for (const k in selectedDatasets) {
			selectedDatasets[k] = val;
		}
	}

	async function handleExport() {
		isExporting = true;
		exportError = null;
		try {
			const datasets = Object.entries(selectedDatasets)
				.filter(([_, v]) => v)
				.map(([k]) => k);

			if (datasets.length === 0) {
				exportError = 'Please select at least one dataset to export.';
				isExporting = false;
				return;
			}

			const res = await fetch('/api/admin/backup/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					datasets,
					passphrase: exportPassphrase.trim() || undefined
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || `Export failed with status ${res.status}`);
			}

			const disposition = res.headers.get('content-disposition');
			let filename = 'run-backup.json';
			if (disposition && disposition.includes('filename=')) {
				const match = disposition.match(/filename="?([^"]+)"?/);
				if (match && match[1]) filename = match[1];
			}

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err: any) {
			exportError = err.message || 'Export failed';
		} finally {
			isExporting = false;
		}
	}

	// Restore state
	let restoreFile = $state<File | null>(null);
	let restorePassphrase = $state('');
	let showRestorePassphrase = $state(false);
	let restoreOverwrite = $state(true);
	let isRestoring = $state(false);
	let restoreResult = $state<any | null>(null);
	let restoreError = $state<string | null>(null);

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			restoreFile = input.files[0];
			restoreResult = null;
			restoreError = null;
		}
	}

	async function handleRestore() {
		if (!restoreFile) {
			restoreError = 'Please select a backup file (.json or .runbackup.json) to restore.';
			return;
		}
		isRestoring = true;
		restoreError = null;
		restoreResult = null;

		try {
			const formData = new FormData();
			formData.append('file', restoreFile);
			formData.append('passphrase', restorePassphrase.trim());
			formData.append('overwrite', restoreOverwrite ? 'true' : 'false');

			const res = await fetch('/api/admin/backup/restore', {
				method: 'POST',
				body: formData
			});

			const data = await res.json();
			if (!res.ok || !data.success) {
				throw new Error(data.error || 'Restore failed');
			}

			restoreResult = data;
		} catch (err: any) {
			restoreError = err.message || 'Restore failed';
		} finally {
			isRestoring = false;
		}
	}

	// Email invite modal
	let emailModalInvite = $state<any | null>(null);
	let emailRecipient = $state('');
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
				onclick={() => (activeTab = 'backup')}
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition {activeTab === 'backup'
					? 'bg-zinc-800 text-zinc-100 shadow-sm'
					: 'text-zinc-400 hover:text-zinc-200'}"
			>
				<Archive class="w-3.5 h-3.5" />
				Backup &amp; Restore
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
						class="py-1.5 px-3 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5"
					>
						<Plus class="w-3.5 h-3.5" />
						Create Code Only
					</button>
					<button
						type="submit"
						formaction="?/createAndEmailInvite"
						class="py-1.5 px-3 rounded-md bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
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
										class="inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 hover:border-amber-500/40 bg-zinc-950 text-[11px] text-amber-300 transition"
										title="Dispatch invite code via email"
									>
										<Mail class="w-3 h-3 text-amber-400" />
										<span>Email</span>
									</button>

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

		<!-- Direct Email Dispatch Modal -->
		{#if emailModalInvite}
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
				<div class="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
					<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
						<div class="flex items-center gap-2">
							<div class="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
								<Mail class="w-4 h-4" />
							</div>
							<div>
								<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">Send Invitation Email</h3>
								<p class="text-[11px] text-zinc-400 font-mono">Dispatching code: <span class="text-amber-300 font-bold">{emailModalInvite.code}</span></p>
							</div>
						</div>
						<button
							type="button"
							onclick={() => { emailModalInvite = null; }}
							class="text-zinc-500 hover:text-zinc-300 p-1"
						>
							<X class="w-4 h-4" />
						</button>
					</div>

					<form
						method="post"
						action="?/sendInviteEmail"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								emailModalInvite = null;
							};
						}}
						class="space-y-4"
					>
						<input type="hidden" name="inviteId" value={emailModalInvite.id} />

						<div>
							<label for="modalRecipientEmail" class="block text-[11px] font-medium text-zinc-300 mb-1">
								Recipient Email Address
							</label>
							<input
								id="modalRecipientEmail"
								type="email"
								name="recipientEmail"
								required
								bind:value={emailRecipient}
								placeholder="colleague@company.com"
								class="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none font-mono"
							/>
							<p class="text-[10px] text-zinc-500 mt-1">
								An invitation email with a secure registration button and locked code will be delivered.
							</p>
						</div>

						<div class="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
							<button
								type="button"
								onclick={() => { emailModalInvite = null; }}
								class="px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-950 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
							>
								Cancel
							</button>
							<button
								type="submit"
								class="px-4 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
							>
								<Send class="w-3.5 h-3.5" />
								<span>Send Invitation</span>
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	{/if}

	<!-- TAB 4: BACKUP & RESTORE -->
	{#if activeTab === 'backup'}
		<div class="space-y-6">
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
				<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
					<div>
						<h2 class="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono flex items-center gap-2">
							<Archive class="w-4 h-4 text-purple-400" />
							Database Backup &amp; Disaster Recovery
						</h2>
						<p class="text-[11px] text-zinc-400 mt-0.5">
							Create selectable encrypted archives (AES-256-GCM) or restore system data with automatic conflict merge.
						</p>
					</div>
				</div>

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
					<!-- EXPORT CARD -->
					<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4 flex flex-col justify-between">
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<h3 class="text-xs font-bold text-zinc-200 font-mono flex items-center gap-1.5">
									<Download class="w-3.5 h-3.5 text-blue-400" />
									Export Database Archive
								</h3>
								<div class="flex items-center gap-2 text-[10px] font-mono">
									<button
										type="button"
										onclick={() => selectAllDatasets(true)}
										class="text-blue-400 hover:underline"
									>
										Select All
									</button>
									<span class="text-zinc-600">|</span>
									<button
										type="button"
										onclick={() => selectAllDatasets(false)}
										class="text-zinc-400 hover:underline"
									>
										Clear All
									</button>
								</div>
							</div>

							<!-- Dataset Checklist -->
							<div class="space-y-2 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80">
								<span class="text-[11px] font-mono text-zinc-400 block font-semibold">Selectable Tables:</span>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
									{#each (data.datasetMetadata || []) as ds}
										<label class="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-800/40 cursor-pointer text-zinc-300">
											<input
												type="checkbox"
												bind:checked={selectedDatasets[ds.id]}
												class="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0"
											/>
											<div class="truncate">
												<span class="font-medium text-zinc-200">{ds.label}</span>
												<span class="text-[10px] text-zinc-500 block">
													({(data.backupStats as any)?.[ds.id] ?? 0} records)
												</span>
											</div>
										</label>
									{/each}
								</div>
							</div>

							<!-- Passphrase Input -->
							<div class="space-y-1.5">
								<label for="exportPassphraseInput" class="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
									<Lock class="w-3.5 h-3.5 text-purple-400" />
									<span>Passphrase Protection (Optional AES-256-GCM)</span>
								</label>
								<div class="relative">
									<input
										id="exportPassphraseInput"
										type={showExportPassphrase ? 'text' : 'password'}
										bind:value={exportPassphrase}
										placeholder="Leave empty for unencrypted JSON"
										class="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 pr-8 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none font-mono"
									/>
									<button
										type="button"
										onclick={() => (showExportPassphrase = !showExportPassphrase)}
										class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
									>
										{#if showExportPassphrase}
											<EyeOff class="w-3.5 h-3.5" />
										{:else}
											<Eye class="w-3.5 h-3.5" />
										{/if}
									</button>
								</div>
								<p class="text-[10px] text-zinc-500">
									If provided, the archive will be encrypted using authenticated AES-256-GCM derived via PBKDF2 (100k rounds).
								</p>
							</div>

							{#if exportError}
								<div class="p-2.5 rounded bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-mono">
									{exportError}
								</div>
							{/if}
						</div>

						<button
							type="button"
							onclick={handleExport}
							disabled={isExporting}
							class="w-full mt-4 py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
						>
							<Download class="w-3.5 h-3.5 {isExporting ? 'animate-bounce' : ''}" />
							<span>{isExporting ? 'Generating Archive...' : 'Download Backup Archive'}</span>
						</button>
					</div>

					<!-- RESTORE CARD -->
					<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4 flex flex-col justify-between">
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<h3 class="text-xs font-bold text-zinc-200 font-mono flex items-center gap-1.5">
									<Upload class="w-3.5 h-3.5 text-emerald-400" />
									Restore Database Archive
								</h3>
								<span class="text-[10px] font-mono text-zinc-500">.json, .runbackup</span>
							</div>

							<!-- File Dropzone -->
							<div class="space-y-1.5">
								<label for="restoreFilePicker" class="text-[11px] font-mono text-zinc-300 block">Select Backup File:</label>
								<div class="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg p-4 text-center cursor-pointer transition bg-zinc-900/30">
									<input
										id="restoreFilePicker"
										type="file"
										accept=".json,.runbackup"
										onchange={handleFileSelect}
										class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
									/>
									<FileJson class="w-6 h-6 text-zinc-500 mx-auto mb-1" />
									{#if restoreFile}
										<div class="text-xs font-mono text-emerald-400 font-semibold">{restoreFile.name}</div>
										<div class="text-[10px] text-zinc-500 font-mono">{(restoreFile.size / 1024).toFixed(1)} KB</div>
									{:else}
										<div class="text-xs text-zinc-400">Click or drag backup file here</div>
										<div class="text-[10px] text-zinc-600 font-mono">Supports unencrypted and AES-256-GCM bundles</div>
									{/if}
								</div>
							</div>

							<!-- Decryption Passphrase Input -->
							<div class="space-y-1.5">
								<label for="restorePassphraseInput" class="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
									<Unlock class="w-3.5 h-3.5 text-amber-400" />
									<span>Decryption Passphrase</span>
								</label>
								<div class="relative">
									<input
										id="restorePassphraseInput"
										type={showRestorePassphrase ? 'text' : 'password'}
										bind:value={restorePassphrase}
										placeholder="Enter password if backup is encrypted"
										class="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 pr-8 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none font-mono"
									/>
									<button
										type="button"
										onclick={() => (showRestorePassphrase = !showRestorePassphrase)}
										class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
									>
										{#if showRestorePassphrase}
											<EyeOff class="w-3.5 h-3.5" />
										{:else}
											<Eye class="w-3.5 h-3.5" />
										{/if}
									</button>
								</div>
							</div>

							<!-- Conflict Strategy Option -->
							<label class="flex items-center gap-2 p-2 rounded bg-zinc-900/40 border border-zinc-800/80 cursor-pointer text-xs font-mono text-zinc-300">
								<input
									type="checkbox"
									bind:checked={restoreOverwrite}
									class="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
								/>
								<div>
									<span class="font-medium text-zinc-200">Overwrite conflicting records</span>
									<span class="text-[10px] text-zinc-500 block">Updates existing links, domains, and settings matching backup keys</span>
								</div>
							</label>

							{#if restoreError}
								<div class="p-2.5 rounded bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-mono">
									{restoreError}
								</div>
							{/if}

							{#if restoreResult}
								<div class="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300 space-y-2">
									<div class="font-bold flex items-center gap-1.5">
										<CheckCircle2 class="w-4 h-4 text-emerald-400" />
										<span>Database Restoration Completed</span>
									</div>
									<div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-zinc-300">
										{#each Object.entries(restoreResult.stats || {}) as [tbl, s]}
											<div class="p-1.5 bg-zinc-950/60 rounded border border-zinc-800">
												<span class="text-zinc-400 block uppercase text-[9px] font-semibold">{tbl}</span>
												<span class="text-emerald-400">+{s.inserted} new</span>
												<span class="text-blue-400 ml-1">~{s.updated} upd</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>

						<button
							type="button"
							onclick={handleRestore}
							disabled={isRestoring || !restoreFile}
							class="w-full mt-4 py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
						>
							<Upload class="w-3.5 h-3.5 {isRestoring ? 'animate-bounce' : ''}" />
							<span>{isRestoring ? 'Decrypting & Restoring...' : 'Decrypt & Restore Database'}</span>
						</button>
					</div>
				</div>
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
