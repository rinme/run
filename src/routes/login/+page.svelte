<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';
	import { Lock, ArrowRight, Shield, ShieldCheck, Ticket, User, Mail, Key } from 'lucide-svelte';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let activeTab = $state<'signin' | 'signup'>('signin');
	let inviteCodeInput = $state('');
	let isSubmitting = $state(false);

	$effect(() => {
		if (data.isFirstUser || data.initialInviteCode || form?.mode === 'signup') {
			activeTab = 'signup';
		}
		if (data.initialInviteCode) {
			inviteCodeInput = data.initialInviteCode;
		}
	});
</script>

<svelte:head>
	<title>{activeTab === 'signin' ? 'Sign In' : 'Join Run'} — Run</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
	<div class="w-full max-w-md">
		<!-- Brand & Header -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 shadow-inner mb-4">
				<span class="font-mono text-xl font-black tracking-tighter text-zinc-100">RUN</span>
			</div>
			<h1 class="text-2xl font-bold tracking-tight text-zinc-100">
				{activeTab === 'signin' ? 'Sign in to your account' : 'Exclusive VIP Registration'}
			</h1>
			<p class="text-xs text-zinc-400 mt-2">
				{activeTab === 'signin'
					? 'Enter your credentials to access the link management dashboard'
					: data.registrationMode === 'invite_only'
						? 'Membership is currently restricted by invite code or direct invitation'
						: 'Create your account to start managing links'}
			</p>
		</div>

		<!-- Auth Card -->
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-6 shadow-xl">
			<!-- Mode Tabs -->
			<div class="flex items-center p-1 rounded-lg bg-zinc-950 border border-zinc-800/80 mb-6">
				<button
					type="button"
					onclick={() => (activeTab = 'signin')}
					class="flex-1 py-1.5 text-xs font-medium rounded-md transition {activeTab === 'signin'
						? 'bg-zinc-800 text-zinc-100 shadow-sm'
						: 'text-zinc-400 hover:text-zinc-200'}"
				>
					Sign In
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'signup')}
					class="flex-1 py-1.5 text-xs font-medium rounded-md transition {activeTab === 'signup'
						? 'bg-zinc-800 text-zinc-100 shadow-sm'
						: 'text-zinc-400 hover:text-zinc-200'}"
				>
					Register
					{#if data.isFirstUser}
						<span class="ml-1 text-[10px] text-emerald-400 font-mono">(Setup Admin)</span>
					{:else if data.registrationMode === 'invite_only'}
						<span class="ml-1 text-[10px] text-amber-400/90 font-mono">(Invite)</span>
					{/if}
				</button>
			</div>

			<!-- Error Feedback Alert -->
			{#if form?.message}
				<div class="mb-5 rounded-lg border border-red-500/20 bg-red-950/30 p-3 text-xs text-red-400 flex items-start gap-2.5">
					<span class="font-bold">Error:</span>
					<span>{form.message}</span>
				</div>
			{/if}

			{#if activeTab === 'signin'}
				<!-- Sign In Form -->
				<form
					method="post"
					action="?/signIn"
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
						<label for="signin-email" class="block text-xs font-medium text-zinc-300 mb-1.5">Email address</label>
						<div class="relative">
							<Mail class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
							<input
								id="signin-email"
								type="email"
								name="email"
								required
								placeholder="admin@example.com"
								autocomplete="email"
								class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
							/>
						</div>
					</div>

					<div>
						<label for="signin-password" class="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
						<div class="relative">
							<Key class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
							<input
								id="signin-password"
								type="password"
								name="password"
								required
								placeholder="••••••••••••"
								autocomplete="current-password"
								class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition font-mono"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-50"
					>
						{#if isSubmitting}
							<span>Signing in...</span>
						{:else}
							<span>Sign In</span>
							<ArrowRight class="w-3.5 h-3.5" />
						{/if}
					</button>
				</form>
			{:else}
				<!-- Registration Form -->
				{#if data.registrationMode === 'closed'}
					<div class="py-6 text-center">
						<Lock class="w-8 h-8 text-zinc-600 mx-auto mb-2" />
						<p class="text-xs font-medium text-zinc-300">Registration is closed</p>
						<p class="text-[11px] text-zinc-500 mt-1">
							New registrations are currently restricted. Contact your organization administrator for an invite.
						</p>
					</div>
				{:else}
					<form
						method="post"
						action="?/signUp"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								isSubmitting = false;
								await update();
							};
						}}
						class="space-y-4"
					>
						<!-- First User Setup Banner OR Invite Code Badge / Input -->
						{#if data.isFirstUser}
							<div class="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-200">
								<div class="flex items-center gap-1.5 font-medium text-xs text-emerald-300 mb-1">
									<Shield class="w-4 h-4 text-emerald-400" />
									Initial Administrator Setup
								</div>
								<p class="text-[11px] text-zinc-400 leading-relaxed">
									No users exist yet. The first account created will automatically become the <span class="text-emerald-300 font-semibold">Super Administrator</span> with full system control. No invite code needed!
								</p>
							</div>
						{:else if data.registrationMode === 'invite_only'}
							{#if data.initialInviteCode}
								<div class="p-3 rounded-lg border border-amber-500/30 bg-amber-950/20 space-y-1.5">
									<div class="flex items-center justify-between mb-1">
										<label for="signup-invite" class="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
											<Lock class="w-3.5 h-3.5 text-amber-400" />
											Invite Code (Locked)
										</label>
										<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1">
											<ShieldCheck class="w-3 h-3 text-emerald-400" />
											Locked by invitation link
										</span>
									</div>
									<div class="relative">
										<input
											id="signup-invite"
											type="text"
											name="inviteCode"
											value={data.initialInviteCode}
											readonly
											tabindex="-1"
											class="w-full uppercase rounded-md border border-amber-500/40 bg-zinc-900/80 px-3 py-1.5 pr-8 text-xs text-amber-200 font-mono tracking-wider cursor-not-allowed select-none opacity-90 font-bold focus:outline-none"
										/>
										<Lock class="w-3.5 h-3.5 text-amber-500/70 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
									</div>
									<p class="text-[10px] text-amber-200/70">
										This code was authorized via your secure email invitation link and cannot be changed.
									</p>
								</div>
							{:else}
								<div class="p-3 rounded-lg border border-amber-500/20 bg-amber-950/20">
									<div class="flex items-center justify-between mb-1.5">
										<label for="signup-invite" class="text-xs font-medium text-amber-300 flex items-center gap-1.5">
											<Ticket class="w-3.5 h-3.5" />
											Invite Code (Required)
										</label>
									</div>
									<input
										id="signup-invite"
										type="text"
										name="inviteCode"
										bind:value={inviteCodeInput}
										required
										placeholder="RUN-VIP-XXXXX"
										class="w-full uppercase rounded-md border border-amber-500/30 bg-zinc-950 px-3 py-1.5 text-xs text-amber-200 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none font-mono tracking-wider transition"
									/>
									<p class="text-[10px] text-zinc-400 mt-1.5">
										Enter the code received via email or given by an admin to unlock registration.
									</p>
								</div>
							{/if}
						{/if}

						<div>
							<label for="signup-name" class="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
							<div class="relative">
								<User class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
								<input
									id="signup-name"
									type="text"
									name="name"
									required
									placeholder="Alex Mercer"
									class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
								/>
							</div>
						</div>

						<div>
							<label for="signup-email" class="block text-xs font-medium text-zinc-300 mb-1.5">Email address</label>
							<div class="relative">
								<Mail class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
								<input
									id="signup-email"
									type="email"
									name="email"
									required
									placeholder="alex@acme.corp"
									autocomplete="email"
									class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition"
								/>
							</div>
						</div>

						<div>
							<label for="signup-password" class="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
							<div class="relative">
								<Key class="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
								<input
									id="signup-password"
									type="password"
									name="password"
									required
									minlength="8"
									placeholder="At least 8 characters"
									autocomplete="new-password"
									class="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition font-mono"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							class="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition disabled:opacity-50"
						>
							{#if isSubmitting}
								<span>Creating account...</span>
							{:else}
								<span>Complete Registration</span>
								<ShieldCheck class="w-3.5 h-3.5 text-emerald-600" />
							{/if}
						</button>
					</form>
				{/if}
			{/if}
		</div>
	</div>
</div>
