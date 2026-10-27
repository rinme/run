<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import {
		Sliders,
		Globe,
		Shield,
		Mail,
		Server,
		Save,
		Send
	} from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>System Settings — Run Admin</title>
</svelte:head>

<div class="p-8 max-w-7xl w-full mx-auto space-y-6">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<Sliders class="w-5 h-5 text-purple-400" />
				<span>System Configuration</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">
				Configure general instance branding, registration gates, email delivery, and feature toggles.
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

				<div>
					<label for="cfgCustomDomainCnameTarget" class="block text-[11px] font-medium text-zinc-400 mb-1">
						Custom Domain DNS CNAME Target (Optional)
					</label>
					<input
						id="cfgCustomDomainCnameTarget"
						type="text"
						name="customDomainCnameTarget"
						value={data.settings.general.customDomainCnameTarget || ''}
						placeholder="e.g. fallback.rinme.me, cname.vercel-dns.com, or cname.run.rinme.me"
						class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
					/>
					<p class="text-[10px] text-zinc-500 mt-1">
						The DNS target host displayed to users when setting up branded custom domains in <a href="/domains" class="text-zinc-300 underline">/domains</a>. Leave empty to default to <span class="font-mono text-zinc-400">cname.{data.settings.general.defaultDomain || 'yourdomain.com'}</span>.
					</p>
				</div>

				<button
					type="submit"
					class="w-full py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
					class="w-full py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
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
				<div>
					<label for="cfgEmailProvider" class="block text-[11px] font-medium text-zinc-400 mb-1">Provider Engine</label>
					<select
						id="cfgEmailProvider"
						name="provider"
						value={data.settings.email.provider}
						class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
					>
						<option value="console">Console (Dev / Mock)</option>
						<option value="smtp">Custom SMTP Server (Yahoo, Gmail, Mailgun, Postmark, etc.)</option>
						<option value="resend">Resend API</option>
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="cfgFromName" class="block text-[11px] font-medium text-zinc-400 mb-1">Sender Name</label>
						<input
							id="cfgFromName"
							type="text"
							name="fromName"
							value={data.settings.email.fromName || 'Run'}
							placeholder="Run Platform"
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="cfgFromEmail" class="block text-[11px] font-medium text-zinc-400 mb-1">Sender Email</label>
						<input
							id="cfgFromEmail"
							type="email"
							name="fromEmail"
							value={data.settings.email.fromEmail}
							placeholder="you@domain.com"
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
							placeholder="smtp.mail.yahoo.com"
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
							placeholder="587"
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
						/>
						<p class="text-[9px] text-zinc-500 mt-0.5">587 (TLS) or 465 (SSL)</p>
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
							placeholder="user@example.com"
							class="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="cfgSmtpPass" class="block text-[11px] font-medium text-zinc-400 mb-1">SMTP Password / App Password</label>
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
					class="w-full py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
				>
					<Save class="w-3.5 h-3.5" />
					Save Email Settings
				</button>
			</form>

			<!-- Test Email Sender -->
			<div class="pt-3 border-t border-zinc-800/80 space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-[11px] font-medium text-zinc-300">Test Email Connection</span>
					<span class="text-[10px] text-zinc-500">Sends a live verification message</span>
				</div>
				<form method="post" action="?/testEmail" use:enhance class="flex gap-2">
					<input
						type="email"
						name="testRecipient"
						placeholder="Recipient email address"
						value={data.user?.email || data.settings.email.fromEmail || ''}
						required
						class="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-zinc-500 focus:outline-none"
					/>
					<button
						type="submit"
						class="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium border border-zinc-700 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
					>
						<Send class="w-3 h-3 text-sky-400" />
						Send Test
					</button>
				</form>
			</div>
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
						<span>Enable AI Title & Slug Generation</span>
					</label>

					<label class="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
						<input
							type="checkbox"
							name="enablePublicStats"
							value="true"
							checked={data.settings.features.enablePublicStats}
							class="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0"
						/>
						<span>Enable Public Link Click Badges & Embeds</span>
					</label>

					<label class="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
						<input
							type="checkbox"
							name="enable3dGlobe"
							value="true"
							checked={data.settings.features.enable3dGlobe}
							class="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0"
						/>
						<span>Enable Interactive 3D WebGL Globe on Analytics Dashboard</span>
					</label>
				</div>

				<button
					type="submit"
					class="w-full py-1.5 rounded-md bg-zinc-100 text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
				>
					<Save class="w-3.5 h-3.5" />
					Save Feature Flags
				</button>
			</form>
		</div>
	</div>
</div>
