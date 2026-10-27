import type { User as BetterAuthUser, Session } from 'better-auth';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface ExtendedUser extends BetterAuthUser {
			role?: 'admin' | 'trusted' | 'member' | string | null;
		}

		interface Locals {
			user?: ExtendedUser;
			session?: Session;
			impersonator?: ExtendedUser;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
