<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import { Users, Building, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Join Workspace — Run</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl mb-4 text-amber-500">
				<Building class="w-7 h-7" />
			</div>
			<h1 class="text-2xl font-bold tracking-tight text-zinc-100">
				Team Workspace Invitation
			</h1>
			<p class="text-sm text-zinc-400 mt-2">
				Collaborate on links, custom domains, and analytics
			</p>
		</div>

		<div class="rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-6 shadow-xl">
			{#if !data.valid}
				<div class="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-center">
					<AlertCircle class="w-8 h-8 text-red-400 mx-auto mb-2" />
					<h3 class="text-sm font-semibold text-red-200">Invalid or Expired Invitation</h3>
					<p class="text-xs text-red-400/80 mt-1">{data.error}</p>
					<a
						href="/"
						class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
					>
						Return to Home
					</a>
				</div>
			{:else}
				<div class="space-y-6">
					<!-- Workspace info card -->
					<div class="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-center">
						<span class="text-[10px] uppercase font-bold tracking-wider text-amber-500/90 block mb-1">
							Invited to join
						</span>
						<h2 class="text-xl font-bold text-zinc-100">
							{data.workspace?.name}
						</h2>
						<div class="flex items-center justify-center gap-3 mt-3 text-xs text-zinc-400">
							<span class="flex items-center gap-1">
								<Users class="w-3.5 h-3.5 text-zinc-500" />
								Invited by <strong class="text-zinc-300 font-medium">{data.inviter}</strong>
							</span>
							<span class="inline-block w-1 h-1 rounded-full bg-zinc-700"></span>
							<span class="flex items-center gap-1">
								<ShieldCheck class="w-3.5 h-3.5 text-amber-500" />
								<span class="capitalize">{data.role}</span>
							</span>
						</div>
					</div>

					{#if form?.error}
						<div class="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-xs text-red-300">
							{form.error}
						</div>
					{/if}

					{#if !data.user}
						<div class="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
							<p class="text-xs text-zinc-400 mb-4">
								You need an active account to accept this invitation and access team resources.
							</p>
							<a
								href={`/login?redirectTo=${encodeURIComponent(`/workspace/join?token=${data.token}`)}`}
								class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition"
							>
								Sign In / Register to Accept <ArrowRight class="w-3.5 h-3.5" />
							</a>
						</div>
					{:else if data.alreadyMember}
						<div class="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 text-center space-y-3">
							<div class="flex items-center justify-center gap-1.5 text-amber-300 text-xs font-medium">
								<CheckCircle2 class="w-4 h-4" /> You are already a member of this workspace.
							</div>
							<form
								method="POST"
								use:enhance={() => {
									isSubmitting = true;
									return async ({ update }) => {
										isSubmitting = false;
										update();
									};
								}}
							>
								<input type="hidden" name="token" value={data.token} />
								<button
									type="submit"
									disabled={isSubmitting}
									class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition disabled:opacity-50"
								>
									{isSubmitting ? 'Switching...' : 'Switch to this Workspace'} <ArrowRight class="w-3.5 h-3.5" />
								</button>
							</form>
						</div>
					{:else}
						<form
							method="POST"
							use:enhance={() => {
								isSubmitting = true;
								return async ({ update }) => {
									isSubmitting = false;
									update();
								};
							}}
							class="space-y-4"
						>
							<input type="hidden" name="token" value={data.token} />

							<div class="text-xs text-zinc-400 text-center">
								Signed in as <strong class="text-zinc-200">{data.user.email}</strong>
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition shadow-md disabled:opacity-50"
							>
								{isSubmitting ? 'Joining...' : 'Accept Invitation & Join'} <ArrowRight class="w-3.5 h-3.5" />
							</button>
						</form>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
