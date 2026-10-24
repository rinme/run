export type MotionMode = 'user' | 'always' | 'never';

class MotionStore {
	mode = $state<MotionMode>('user');
	isClient = $state(false);

	constructor() {
		if (typeof window !== 'undefined') {
			this.isClient = true;
			const saved = localStorage.getItem('run_motion_mode') as MotionMode | null;
			if (saved && (saved === 'user' || saved === 'always' || saved === 'never')) {
				this.mode = saved;
			}
			this.applyClass(this.mode);
		}
	}

	setMode(newMode: MotionMode) {
		this.mode = newMode;
		if (typeof window !== 'undefined') {
			localStorage.setItem('run_motion_mode', newMode);
			this.applyClass(newMode);
		}
	}

	private applyClass(mode: MotionMode) {
		if (typeof document === 'undefined') return;
		if (mode === 'always') {
			document.documentElement.classList.add('reduce-motion');
		} else {
			document.documentElement.classList.remove('reduce-motion');
		}
	}
}

export const motionSettings = new MotionStore();

export const crispSpring = {
	type: 'spring' as const,
	stiffness: 300,
	damping: 25
};

export const gentleSpring = {
	type: 'spring' as const,
	stiffness: 220,
	damping: 22
};

export const quickFade = {
	duration: 0.15,
	ease: 'easeInOut' as const
};
