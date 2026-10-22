<script lang="ts">
	import * as THREE from 'three';

	interface GlobePoint {
		lat: number;
		lng: number;
		label?: string;
		color?: string;
	}

	interface GlobeProps {
		points?: GlobePoint[];
		className?: string;
	}

	const isBrowser = typeof window !== 'undefined';

	let {
		points = [
			{ lat: 37.7749, lng: -122.4194, label: 'San Francisco', color: '#38bdf8' },
			{ lat: 40.7128, lng: -74.006, label: 'New York', color: '#60a5fa' },
			{ lat: 51.5074, lng: -0.1278, label: 'London', color: '#818cf8' },
			{ lat: 52.52, lng: 13.405, label: 'Berlin', color: '#a78bfa' },
			{ lat: 35.6762, lng: 139.6503, label: 'Tokyo', color: '#f472b6' },
			{ lat: 1.3521, lng: 103.8198, label: 'Singapore', color: '#34d399' }
		],
		className = 'w-full h-full'
	}: GlobeProps = $props();

	let containerRef = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!isBrowser || !containerRef) return;

		const width = containerRef.clientWidth || 400;
		const height = containerRef.clientHeight || 400;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
		camera.position.z = 240;

		const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		containerRef.appendChild(renderer.domElement);

		// Globe sphere geometry
		const radius = 80;
		const globeGroup = new THREE.Group();
		scene.add(globeGroup);

		// 1. Inner dark sphere
		const sphereGeo = new THREE.SphereGeometry(radius, 64, 64);
		const sphereMat = new THREE.MeshBasicMaterial({
			color: 0x09090b,
			wireframe: false
		});
		const sphere = new THREE.Mesh(sphereGeo, sphereMat);
		globeGroup.add(sphere);

		// 2. Wireframe / Latitude-Longitude Grid Rings
		const wireframeMat = new THREE.MeshBasicMaterial({
			color: 0x27272a,
			wireframe: true,
			transparent: true,
			opacity: 0.35
		});
		const wireSphere = new THREE.Mesh(sphereGeo, wireframeMat);
		globeGroup.add(wireSphere);

		// 3. Atmosphere glow ring
		const atmosphereGeo = new THREE.SphereGeometry(radius * 1.15, 32, 32);
		const atmosphereMat = new THREE.MeshBasicMaterial({
			color: 0x3b82f6,
			wireframe: true,
			transparent: true,
			opacity: 0.08
		});
		const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
		globeGroup.add(atmosphere);

		// Helper to convert Lat/Lng to Vector3
		function latLngToVector3(lat: number, lng: number, r: number): THREE.Vector3 {
			const phi = (90 - lat) * (Math.PI / 180);
			const theta = (lng + 180) * (Math.PI / 180);
			return new THREE.Vector3(
				-(r * Math.sin(phi) * Math.cos(theta)),
				r * Math.cos(phi),
				r * Math.sin(phi) * Math.sin(theta)
			);
		}

		// 4. Markers for Click Points
		const markerGroup = new THREE.Group();
		globeGroup.add(markerGroup);

		points.forEach((pt) => {
			const pos = latLngToVector3(pt.lat, pt.lng, radius * 1.01);
			const pinGeo = new THREE.SphereGeometry(1.6, 16, 16);
			const pinMat = new THREE.MeshBasicMaterial({
				color: new THREE.Color(pt.color || '#38bdf8')
			});
			const pin = new THREE.Mesh(pinGeo, pinMat);
			pin.position.copy(pos);
			markerGroup.add(pin);

			// Pulsing Beacon Ring
			const ringGeo = new THREE.RingGeometry(2, 3.2, 16);
			const ringMat = new THREE.MeshBasicMaterial({
				color: new THREE.Color(pt.color || '#38bdf8'),
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.6
			});
			const ring = new THREE.Mesh(ringGeo, ringMat);
			ring.position.copy(pos);
			ring.lookAt(new THREE.Vector3(0, 0, 0));
			markerGroup.add(ring);
		});

		// Interaction handling (drag rotation)
		let isDragging = false;
		let prevMouseX = 0;
		let prevMouseY = 0;
		let autoRotate = true;

		const onPointerDown = (e: PointerEvent) => {
			isDragging = true;
			autoRotate = false;
			prevMouseX = e.clientX;
			prevMouseY = e.clientY;
		};

		const onPointerMove = (e: PointerEvent) => {
			if (!isDragging) return;
			const deltaX = e.clientX - prevMouseX;
			const deltaY = e.clientY - prevMouseY;
			globeGroup.rotation.y += deltaX * 0.005;
			globeGroup.rotation.x += deltaY * 0.005;
			prevMouseX = e.clientX;
			prevMouseY = e.clientY;
		};

		const onPointerUp = () => {
			isDragging = false;
			setTimeout(() => {
				autoRotate = true;
			}, 3000);
		};

		const domEl = renderer.domElement;
		domEl.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		// Resize observer
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const w = entry.contentRect.width;
				const h = entry.contentRect.height;
				if (w > 0 && h > 0) {
					camera.aspect = w / h;
					camera.updateProjectionMatrix();
					renderer.setSize(w, h);
				}
			}
		});
		resizeObserver.observe(containerRef);

		// Animation loop
		let animationFrameId: number;
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);
			if (autoRotate) {
				globeGroup.rotation.y += 0.003;
			}
			renderer.render(scene, camera);
		};
		animate();

		// Cleanup
		return () => {
			cancelAnimationFrame(animationFrameId);
			resizeObserver.disconnect();
			domEl.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			renderer.dispose();
			sphereGeo.dispose();
			sphereMat.dispose();
			wireframeMat.dispose();
			if (domEl.parentNode) {
				domEl.parentNode.removeChild(domEl);
			}
		};
	});
</script>

<div bind:this={containerRef} class="relative overflow-hidden cursor-grab active:cursor-grabbing {className}">
	<div class="absolute top-3 left-3 text-xs text-zinc-400 font-mono tracking-wider pointer-events-none select-none flex items-center gap-1.5">
		<span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
		GLOBAL REAL-TIME TRAFFIC
	</div>
</div>
