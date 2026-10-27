<script lang="ts">
	import type { PageServerData } from './$types';
	import {
		Shield,
		Users,
		Sliders,
		Ticket,
		Archive,
		Monitor,
		Activity,
		Link2,
		Globe,
		Webhook,
		ArrowRight,
		ExternalLink
	} from 'lucide-svelte';

	let { data }: { data: PageServerData } = $props();

	function formatDate(val: string | number | Date | null | undefined): string {
		if (!val) return '—';
		return new Date(val).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const adminCards = $derived([
		{
			title: 'User Accounts',
			desc: 'Manage roles, passwords, sessions & spectate dashboards',
			href: '/admin/users',
			icon: Users,
			badge: `${data.stats.users} Users`,
			color: 'text-purple-400',
			borderColor: 'hover:border-purple-500/50'
		},
		{
			title: 'System Settings',
			desc: 'General branding, registration mode, SMTP & feature flags',
			href: '/admin/settings',
			icon: Sliders,
			badge: 'Configured',
			color: 'text-blue-400',
			borderColor: 'hover:border-blue-500/50'
		},
		{
			title: 'VIP Invite Codes',
			desc: 'Create and dispatch invite links for registration gate',
			href: '/admin/invites',
			icon: Ticket,
			badge: `${data.stats.invites} Codes`,
			color: 'text-amber-400',
			borderColor: 'hover:border-amber-500/50'
		},
		{
			title: 'Backup & Restore',
			desc: 'Encrypted JSON archives & emergency disaster recovery',
			href: '/admin/backup',
			icon: Archive,
			badge: 'AES-256',
			color: 'text-emerald-400',
			borderColor: 'hover:border-emerald-500/50'
		},
		{
			title: 'Active Sessions',
			desc: 'Inspect and terminate live client bearer tokens',
			href: '/admin/sessions',
			icon: Monitor,
			badge: `${data.stats.sessions} Live`,
			color: 'text-sky-400',
			borderColor: 'hover:border-sky-500/50'
		}
	]);
</script>

<svelte:head>
	<title>Administration Overview — Run</title>
</svelte:head>

<div class="p-8 max-w-7xl w-full mx-auto space-y-8">
	<!-- Top Bar Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
		<div>
			<h1 class="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
				<Shield class="w-5 h-5 text-purple-400" />
				<span>Administration Command Center</span>
			</h1>
			<p class="text-xs text-zinc-400 mt-0.5">
				Instance vitals, account management, configuration, and security controls.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a
				href="/admin/users"
				class="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
			>
				<Users class="w-3.5 h-3.5 text-purple-600" />
				<span>Manage Accounts</span>
			</a>
		</div>
	</div>

	<!-- Vitals Numbers Grid -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
			<div class="flex items-center justify-between text-zinc-500 text-xs font-mono">
				<span>REGISTERED USERS</span>
				<Users class="w-4 h-4 text-purple-400" />
			</div>
			<div class="text-2xl font-bold font-mono text-zinc-100 mt-2">{data.stats.users}</div>
		</div>

		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
			<div class="flex items-center justify-between text-zinc-500 text-xs font-mono">
				<span>TOTAL LINKS</span>
				<Link2 class="w-4 h-4 text-blue-400" />
			</div>
			<div class="text-2xl font-bold font-mono text-zinc-100 mt-2">{data.stats.links}</div>
		</div>

		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
			<div class="flex items-center justify-between text-zinc-500 text-xs font-mono">
				<span>ACTIVE SESSIONS</span>
				<Monitor class="w-4 h-4 text-emerald-400" />
			</div>
			<div class="text-2xl font-bold font-mono text-zinc-100 mt-2">{data.stats.sessions}</div>
		</div>

		<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
			<div class="flex items-center justify-between text-zinc-500 text-xs font-mono">
				<span>DOMAINS ROUTED</span>
				<Globe class="w-4 h-4 text-amber-400" />
			</div>
			<div class="text-2xl font-bold font-mono text-zinc-100 mt-2">{data.stats.domains}</div>
		</div>
	</div>

	<!-- Navigation Section Cards -->
	<div>
		<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono mb-3">
			Management Portals
		</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each adminCards as card}
				<a
					href={card.href}
					class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3 transition group {card.borderColor} hover:bg-zinc-850/50 shadow-sm"
				>
					<div class="flex items-center justify-between">
						<div class="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 {card.color}">
							<card.icon class="w-4 h-4" />
						</div>
						<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
							{card.badge}
						</span>
					</div>

					<div>
						<h3 class="text-sm font-semibold text-zinc-100 group-hover:text-blue-400 transition flex items-center justify-between">
							<span>{card.title}</span>
							<ArrowRight class="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
						</h3>
						<p class="text-xs text-zinc-400 mt-1 leading-relaxed">
							{card.desc}
						</p>
					</div>
				</a>
			{/each}
		</div>
	</div>

	<!-- Recent Registrations -->
	<div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
		<div class="flex items-center justify-between border-b border-zinc-800 pb-3">
			<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono flex items-center gap-2">
				<Activity class="w-4 h-4 text-purple-400" />
				Recent User Registrations
			</h2>
			<a href="/admin/users" class="text-xs text-zinc-400 hover:text-zinc-200 transition">
				View All Users &rarr;
			</a>
		</div>

		<div class="border border-zinc-800 rounded-lg overflow-hidden">
			<table class="w-full text-left text-xs">
				<thead class="bg-zinc-950/80 text-zinc-500 border-b border-zinc-800 font-mono text-[10px] uppercase">
					<tr>
						<th class="p-3">User</th>
						<th class="p-3">Role</th>
						<th class="p-3">Joined Date</th>
						<th class="p-3 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-800/60">
					{#each data.recentUsers as u (u.id)}
						<tr class="hover:bg-zinc-800/30 transition">
							<td class="p-3">
								<div class="font-medium text-zinc-200">{u.name}</div>
								<div class="text-[11px] text-zinc-500 font-mono">{u.email}</div>
							</td>
							<td class="p-3">
								<span
									class="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold {u.role === 'admin'
										? 'bg-purple-950 text-purple-300 border border-purple-800/60'
										: u.role === 'trusted'
											? 'bg-sky-950 text-sky-300 border border-sky-800/60'
											: 'bg-zinc-800 text-zinc-300 border border-zinc-700'}"
								>
									{u.role}
								</span>
							</td>
							<td class="p-3 text-zinc-400 font-mono text-[11px]">
								{formatDate(u.createdAt)}
							</td>
							<td class="p-3 text-right">
								<a
									href="/admin/users"
									class="text-xs text-blue-400 hover:text-blue-300 underline font-mono"
								>
									Manage
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
