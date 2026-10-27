<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-svelte';

	let { form }: { form: ActionData } = $props();
	let isSubmitting = $state(false);
	let submitted = $derived(Boolean(form?.success));
</script>

<svelte:head>
	<title>Forgot Password — Run</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
	<div class="w-full max-w-md">
		<!-- Brand & Header -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner mb-4">
				<span class="font-mono text-xl font-black tracking-tighter text-zinc-100">RUN</span>
			</div>
			<h1 class="text-2xl font-bold tracking-tight text-zinc-100">
				Reset your password
			</h1>
			<p class="text-xs text-zinc-400 mt-2">
				Enter the email associated with your account and we'll send you a secure link to reset your password.
			</p>
		</div>

		<!-- Card -->
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-6 shadow-xl space-y-5">
			{#if form?.message}
				<div class="rounded-lg border {form?.success ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-300' : 'border-red-500/20 bg-red-950/30 text-red-400'} p-3.5 text-xs flex items-start gap-2.5">
					{#if form?.success}
						<CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
					{/if}
					<div>
						<span class="font-bold">{form?.success ? 'Check your email:' : 'Error:'}</span>
						<p class="mt-0.5 leading-relaxed">{form.message}</p>
					</div>
				</div>
			{/if}

			{#if !submitted}
				<form
					method="post"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							isSubmitting = false;
							await update();
						};
					}}
					class="space-y-4"
				>
					<div>
						<label for="forgot-email" class="block text-xs font-medium text-zinc-300 mb-1.5">Email address</label>
						<div class="relative">
							<Mail class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
							<input
								id="forgot-email"
								type="email"
								name="email"
								required
								placeholder="admin@example.com"
								autocomplete="email"
								class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer"
					>
						{#if isSubmitting}
							<span>Sending link...</span>
						{:else}
							<span>Send Password Reset Link</span>
							<Send class="w-3.5 h-3.5 text-zinc-800" />
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
