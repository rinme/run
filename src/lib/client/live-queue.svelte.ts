/**
 * Svelte 5 Rune-based Live Replay Queue Manager
 * Buffers incoming click events and trickles them into an active display array ~1 event/sec
 */

export interface LiveClickItem {
	id: string;
	timestamp: string;
	slug: string;
	country: string;
	city: string;
	deviceType: string;
	browser: string;
	os: string;
	referer: string;
}

export class LiveQueueManager {
	// Svelte 5 reactive runes
	events = $state<LiveClickItem[]>([]);
	activeCount = $derived(this.events.length);
	isStreaming = $state(false);

	private buffer: LiveClickItem[] = [];
	private trickleTimer: ReturnType<typeof setInterval> | null = null;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private maxDisplayed = 30;

	constructor(maxDisplayed = 30) {
		this.maxDisplayed = maxDisplayed;
	}

	start(workspaceId?: string) {
		if (this.isStreaming) return;
		this.isStreaming = true;

		// 1. Initial fetch & periodic 10-second polling
		this.fetchRecentClicks(workspaceId);
		this.pollTimer = setInterval(() => {
			this.fetchRecentClicks(workspaceId);
		}, 10000);

		// 2. Trickle buffer into reactive display queue ~1 event/sec
		this.trickleTimer = setInterval(() => {
			if (this.buffer.length > 0) {
				const nextItem = this.buffer.shift();
				if (nextItem) {
					this.events = [nextItem, ...this.events].slice(0, this.maxDisplayed);
				}
			}
		}, 1000);
	}

	stop() {
		this.isStreaming = false;
		if (this.pollTimer) clearInterval(this.pollTimer);
		if (this.trickleTimer) clearInterval(this.trickleTimer);
		this.pollTimer = null;
		this.trickleTimer = null;
	}

	pushEvent(event: LiveClickItem) {
		this.buffer.push(event);
	}

	private async fetchRecentClicks(workspaceId?: string) {
		try {
			const res = await fetch(`/api/stats/live${workspaceId ? `?workspaceId=${workspaceId}` : ''}`);
			if (res.ok) {
				const data = (await res.json()) as { events: LiveClickItem[] };
				if (Array.isArray(data.events)) {
					for (const item of data.events) {
						// Only push if not already in buffer or events
						const alreadyExists =
							this.events.some((e) => e.id === item.id) ||
							this.buffer.some((b) => b.id === item.id);
						if (!alreadyExists) {
							this.buffer.push(item);
						}
					}
				}
			}
		} catch (e) {
			console.warn('Error polling live clicks:', e);
		}
	}
}
