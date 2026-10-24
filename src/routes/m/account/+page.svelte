<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import {
		User,
		Mail,
		Shield,
		Monitor,
		LogOut,
		Smartphone,
		Check,
		AlertCircle,
		Laptop
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';

	interface PageProps {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: PageProps = $props();

	let name = $state('');
	let isSaving = $state(false);
	let saveFeedback = $state<string | null>(null);

	$effect.pre(() => {
		name = data.user.name || '';
	});

	$effect(() => {
		if (form?.success) {
			saveFeedback = 'Profile updated successfully!';
			setTimeout(() => (saveFeedback = null), 3000);
		} else if (form?.message) {
			saveFeedback = form.message;
		}
	});
</script>

<svelte:head>
	<title>Account — Run Mobile</title>
</svelte:head>

<div class="space-y-4">
	<!-- Page Header -->
	<div>
		<h1 class="text-base font-bold text-zinc-100 flex items-center gap-2">
			<User class="w-4 h-4 text-blue-400" />
			<span>Account &amp; Security</span>
		</h1>
		<p class="text-xs text-zinc-400 mt-0.5">Manage your profile and device sessions</p>
	</div>

	<!-- Profile Summary Card -->
	<div class="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3.5">
		<div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-blue-500/20 shrink-0">
			{(data.user.name || data.user.email || 'U').charAt(0).toUpperCase()}
		</div>
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span class="text-sm font-bold text-zinc-100 truncate">{data.user.name || 'Unnamed User'}</span>
				<span class="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
					{data.user.role || 'Member'}
				</span>
			</div>
			<div class="text-xs text-zinc-400 truncate mt-0.5 flex items-center gap-1">
				<Mail class="w-3 h-3 text-zinc-500 shrink-0" />
				<span class="truncate">{data.user.email}</span>
			</div>
		</div>
	</div>

	<!-- Edit Profile Form -->
	<div class="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
		<h2 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
			Edit Profile
		</h2>

		{#if saveFeedback}
			<div class="px-3 py-2 rounded-xl text-xs flex items-center gap-2 {form?.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">
				{#if form?.success}
					<Check class="w-3.5 h-3.5 shrink-0" />
				{:else}
					<AlertCircle class="w-3.5 h-3.5 shrink-0" />
				{/if}
				<span>{saveFeedback}</span>
			</div>
		{/if}

		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => {
				isSaving = true;
				return async ({ update }) => {
					isSaving = false;
					await update();
				};
			}}
			class="space-y-3"
		>
			<div>
				<label for="name" class="block text-xs font-medium text-zinc-400 mb-1">
					Full Name
				</label>
				<input
					id="name"
					name="name"
					type="text"
					bind:value={name}
					required
					class="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-hidden transition-colors"
				/>
			</div>

			<button
				type="submit"
				disabled={isSaving}
				class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm active:scale-95 cursor-pointer"
			>
				{isSaving ? 'Saving...' : 'Update Name'}
			</button>
		</form>
	</div>

	<!-- View Mode Switch Card -->
	<div class="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Monitor class="w-4 h-4 text-purple-400" />
				<h2 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
					Desktop / PC Mode
				</h2>
			</div>
			<span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
				Cookie
			</span>
		</div>
		<p class="text-xs text-zinc-400 leading-relaxed">
			Prefer the full multi-column dashboard with 3D Globe, Webhooks, API keys, and Domain configuration? Switch to Desktop mode anytime.
		</p>
		<a
			href="/api/view-mode?mode=desktop&redirect=/"
			class="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 text-xs font-semibold rounded-xl border border-zinc-700/80 transition-colors active:scale-95 shadow-xs"
		>
			<Laptop class="w-4 h-4 text-purple-400" />
			<span>Switch to PC View</span>
		</a>
	</div>

	<!-- Active Sessions -->
	<div class="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
		<h2 class="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
			Active Sessions ({data.sessions.length})
		</h2>
		<div class="space-y-2">
			{#each data.sessions as sess (sess.id)}
				<div class="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/60 flex items-center justify-between text-xs">
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1.5">
							<span class="font-mono text-zinc-200 text-[11px] truncate">{sess.ipAddress}</span>
							{#if sess.ipAddress === '127.0.0.1' || sess.ipAddress === '::1'}
								<span class="text-[9px] text-zinc-500 font-sans">(Localhost)</span>
							{/if}
							{#if sess.isCurrent}
								<span class="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
									Current
								</span>
							{/if}
						</div>
						<div class="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">{sess.userAgent}</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Sign Out -->
	<form method="POST" action="?/signOut">
		<button
			type="submit"
			class="w-full flex items-center justify-center gap-2 py-3 bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-900/50 rounded-2xl text-xs font-semibold transition-colors active:scale-95 cursor-pointer"
		>
			<LogOut class="w-4 h-4" />
			<span>Sign Out of Run</span>
		</button>
	</form>
</div>
