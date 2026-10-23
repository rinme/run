/**
 * Svelte 5 Rune-based Live Replay Queue Manager
 * Buffers incoming click events and trickles them into an active display array ~1 event/sec
 * Includes tab visibility checks, concurrency locks, and exponential error backoff
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
	private pollTimer: ReturnType<typeof setTimeout> | null = null;
	private maxDisplayed = 30;
	private isFetching = false;
	private failureCount = 0;
	private workspaceId?: string;
	private boundVisibilityHandler: (() => void) | null = null;

	constructor(maxDisplayed = 30) {
		this.maxDisplayed = maxDisplayed;
	}

	start(workspaceId?: string) {
		if (this.isStreaming) return;
		this.isStreaming = true;
		this.workspaceId = workspaceId;
		this.failureCount = 0;

		// 1. Initial fetch & scheduled polling
		this.scheduleNextPoll(0);

		// 2. Tab visibility listener: pause polling when hidden, resume when visible
		if (typeof document !== 'undefined') {
			this.boundVisibilityHandler = () => {
				if (!document.hidden && this.isStreaming && !this.isFetching) {
					this.scheduleNextPoll(100);
				}
			};
			document.addEventListener('visibilitychange', this.boundVisibilityHandler);
		}

		// 3. Trickle buffer into reactive display queue ~1 event/sec
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
		if (this.pollTimer) clearTimeout(this.pollTimer);
		if (this.trickleTimer) clearInterval(this.trickleTimer);
		this.pollTimer = null;
		this.trickleTimer = null;

		if (typeof document !== 'undefined' && this.boundVisibilityHandler) {
			document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
			this.boundVisibilityHandler = null;
		}
	}

	pushEvent(event: LiveClickItem) {
		this.buffer.push(event);
	}

	private scheduleNextPoll(delayMs: number) {
		if (!this.isStreaming) return;
		if (this.pollTimer) clearTimeout(this.pollTimer);

		this.pollTimer = setTimeout(async () => {
			if (!this.isStreaming) return;

			// Don't poll if document is hidden in background
			if (typeof document !== 'undefined' && document.hidden) {
				this.scheduleNextPoll(10000);
				return;
			}

			await this.fetchRecentClicks();

			if (!this.isStreaming) return;

			// Exponential backoff on error: 10s, 20s, 40s, max 60s
			let nextDelay = 10000;
			if (this.failureCount > 0) {
				nextDelay = Math.min(60000, 10000 * Math.pow(2, Math.min(this.failureCount, 3)));
			}
			this.scheduleNextPoll(nextDelay);
		}, delayMs);
	}

	private async fetchRecentClicks() {
		if (this.isFetching) return;
		this.isFetching = true;

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 6000);

			const url = `/api/stats/live${this.workspaceId ? `?workspaceId=${encodeURIComponent(this.workspaceId)}` : ''}`;
			const res = await fetch(url, { signal: controller.signal });
			clearTimeout(timeout);

			if (res.ok) {
				this.failureCount = 0;
				const data = (await res.json()) as { events: LiveClickItem[] };
				if (Array.isArray(data.events)) {
					for (const item of data.events) {
						const alreadyExists =
							this.events.some((e) => e.id === item.id) ||
							this.buffer.some((b) => b.id === item.id);
						if (!alreadyExists) {
							this.buffer.push(item);
						}
					}
				}
			} else {
				this.failureCount++;
			}
		} catch {
			this.failureCount++;
		} finally {
			this.isFetching = false;
		}
	}
}
