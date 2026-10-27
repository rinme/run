<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import { Key, ArrowRight, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let password = $state('');
	let confirmPassword = $state('');
	let clientError = $state('');
	let isSubmitting = $state(false);

	let passwordMismatch = $derived(confirmPassword.length > 0 && password !== confirmPassword);
	let passwordMatch = $derived(confirmPassword.length > 0 && password === confirmPassword);
	let success = $derived(Boolean(form?.success));
</script>

<svelte:head>
	<title>Set New Password — Run</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
	<div class="w-full max-w-md">
		<!-- Brand & Header -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner mb-4">
				<span class="font-mono text-xl font-black tracking-tighter text-zinc-100">RUN</span>
			</div>
			<h1 class="text-2xl font-bold tracking-tight text-zinc-100">
				Choose a new password
			</h1>
			<p class="text-xs text-zinc-400 mt-2">
				Enter a strong password to update your account credentials.
			</p>
		</div>

		<!-- Card -->
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-6 shadow-xl space-y-5">
			<!-- Missing Token Warning -->
			{#if !data.token && !success}
				<div class="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200 space-y-2">
					<div class="flex items-center gap-2 font-semibold text-amber-300">
						<AlertTriangle class="w-4 h-4 text-amber-400 shrink-0" />
						Invalid or Missing Reset Link
					</div>
					<p class="text-[11px] text-zinc-400 leading-relaxed">
						This link is either missing an authentication token or has already expired. Please request a new password reset link.
					</p>
					<a
						href="/forgot-password"
						class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 underline mt-1"
					>
						Request a new reset link &rarr;
					</a>
				</div>
			{/if}

			<!-- Error Feedback Alert -->
			{#if clientError || form?.message || data.urlError}
				<div class="rounded-lg border {form?.success ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300' : 'border-red-500/20 bg-red-950/30 text-red-400'} p-3.5 text-xs flex items-start gap-2.5">
					{#if form?.success}
						<CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
					{/if}
					<div>
						<span class="font-bold">{form?.success ? 'Success:' : 'Notice:'}</span>
						<p class="mt-0.5 leading-relaxed">{clientError || form?.message || data.urlError}</p>
					</div>
				</div>
			{/if}

			{#if success}
				<div class="space-y-4 pt-2">
					<a
						href="/login"
						class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition shadow-sm"
					>
						<span>Proceed to Sign In</span>
						<ArrowRight class="w-3.5 h-3.5" />
					</a>
				</div>
			{:else if data.token}
				<form
					method="post"
					use:enhance={({ cancel }) => {
						clientError = '';
						if (password !== confirmPassword) {
							clientError = 'Passwords do not match.';
							cancel();
							return;
						}
						isSubmitting = true;
						return async ({ update }) => {
							isSubmitting = false;
							await update();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="token" value={data.token} />

					<div>
						<label for="reset-password" class="block text-xs font-medium text-zinc-300 mb-1.5">New Password</label>
						<div class="relative">
							<Key class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
							<input
								id="reset-password"
								type="password"
								name="password"
								bind:value={password}
								required
								minlength="8"
								autocomplete="new-password"
								placeholder="At least 8 characters"
								class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition font-mono"
							/>
						</div>
					</div>

					<div>
						<label for="reset-confirm-password" class="block text-xs font-medium text-zinc-300 mb-1.5">Confirm New Password</label>
						<div class="relative">
							<Key class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
							<input
								id="reset-confirm-password"
								type="password"
								name="confirmPassword"
								bind:value={confirmPassword}
								required
								minlength="8"
								autocomplete="new-password"
								placeholder="Re-enter new password"
								class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition font-mono"
							/>
						</div>
						{#if passwordMismatch}
							<p class="text-[11px] text-red-400 mt-1">Passwords do not match</p>
						{:else if passwordMatch}
							<p class="text-[11px] text-emerald-400 mt-1">Passwords match</p>
						{/if}
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer"
					>
						{#if isSubmitting}
							<span>Updating password...</span>
						{:else}
							<span>Reset & Save Password</span>
							<ArrowRight class="w-3.5 h-3.5" />
						{/if}
					</button>
				</form>
			{/if}

			<div class="pt-2 border-t border-zinc-800 text-center">
				<a
					href="/login"
					class="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
				>
					<ArrowLeft class="w-3.5 h-3.5" />
					<span>Back to Sign In</span>
				</a>
			</div>
		</div>
	</div>
</div>
