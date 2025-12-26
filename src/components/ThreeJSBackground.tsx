import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeJSBackground: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const linesRef = useRef<THREE.LineSegments | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Setup
        const scene = new THREE.Scene();
        // Transparent background to blend with CSS gradients
        scene.background = null;
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 30;
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Particles
        const particleCount = 200; // Increased for better density
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities: { x: number; y: number; z: number }[] = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

            velocities.push({
                x: (Math.random() - 0.5) * 0.01,
                y: (Math.random() - 0.5) * 0.01,
                z: (Math.random() - 0.5) * 0.005
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.7,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        particlesRef.current = particles;

        // Lines (Connections)
        // We'll update line positions in the animation loop
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending
        });
        const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene.add(lines);
        linesRef.current = lines;

        // Resize
        const handleResize = () => {
            if (cameraRef.current && rendererRef.current) {
                cameraRef.current.aspect = window.innerWidth / window.innerHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        // Animation Loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            if (particlesRef.current && linesRef.current) {
                const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

                // Update particles
                for (let i = 0; i < particleCount; i++) {
                    // Apply velocity
                    positions[i * 3] += velocities[i].x;
                    positions[i * 3 + 1] += velocities[i].y;
                    positions[i * 3 + 2] += velocities[i].z;

                    // Constant slow rotation - REMOVED
                    // particlesRef.current.rotation.y += 0.0002;

                    // Boundary wrap
                    if (positions[i * 3] > 50) positions[i * 3] = -50;
                    if (positions[i * 3] < -50) positions[i * 3] = 50;
                    if (positions[i * 3 + 1] > 50) positions[i * 3 + 1] = -50;
                    if (positions[i * 3 + 1] < -50) positions[i * 3 + 1] = 50;
                }
                particlesRef.current.geometry.attributes.position.needsUpdate = true;

                // Update connections
                // Find close particles and draw lines
                const linePositions: number[] = [];
                const connectDistance = 20;

                for (let i = 0; i < particleCount; i++) {
                    for (let j = i + 1; j < particleCount; j++) {
                        const dx = positions[i * 3] - positions[j * 3];
                        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                        const distSq = dx * dx + dy * dy + dz * dz;

                        if (distSq < connectDistance * connectDistance) {
                            linePositions.push(
                                positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                                positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
                            );
                        }
                    }
                }

                linesRef.current.geometry.setAttribute(
                    'position',
                    new THREE.Float32BufferAttribute(linePositions, 3)
                );
            }

            renderer.render(scene, camera);
        };

        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);

            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }

            geometry.dispose();
            material.dispose();
            lineGeometry.dispose();
            lineMaterial.dispose();
            renderer.dispose();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.6 }} // Subtle overlay
        />
    );
};

export default ThreeJSBackground;
