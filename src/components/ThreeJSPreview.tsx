import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ThreeJSPreviewProps {
    code: string;
}

const ThreeJSPreview: React.FC<ThreeJSPreviewProps> = ({ code }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const frameIdRef = useRef<number>(0);
    const controlsRef = useRef<OrbitControls | null>(null);
    const [enableAnimation, setEnableAnimation] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Setup Basic Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111); // Dark background

        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 2. Add Helpers & Controls (Debug Mode)
        const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(2);
        scene.add(axesHelper);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controlsRef.current = controls;

        // 3. Add Default Lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // 4. Execute User Code
        try {
            // Sanitize code: Remove standard boilerplate that conflicts with our setup
            let sanitizedCode = code
                .replace(/const\s+scene\s*=\s*new\s+THREE\.Scene\(\);/g, '// Using provided scene')
                .replace(/const\s+camera\s*=\s*new\s+THREE\.PerspectiveCamera.*?;/g, '// Using provided camera')
                .replace(/const\s+renderer\s*=\s*new\s+THREE\.WebGLRenderer.*?;/g, '// Using provided renderer')
                .replace(/renderer\.setSize.*?;/g, '')
                .replace(/document\.body\.appendChild.*?;/g, '')
                // Fix: Replace window/document listeners with canvas listeners
                .replace(/window\.addEventListener/g, 'renderer.domElement.addEventListener')
                .replace(/window\.removeEventListener/g, 'renderer.domElement.removeEventListener')
                .replace(/document\.addEventListener/g, 'renderer.domElement.addEventListener')
                .replace(/document\.removeEventListener/g, 'renderer.domElement.removeEventListener')
                .replace(/document\.body\.addEventListener/g, 'renderer.domElement.addEventListener')
                .replace(/document\.body\.removeEventListener/g, 'renderer.domElement.removeEventListener')
                .replace(/renderer\.domElement(?!\.(add|remove)EventListener)/g, '/* renderer.domElement */')
                // Fix: Replace window dimensions with canvas dimensions
                .replace(/window\.innerWidth/g, 'renderer.domElement.width')
                .replace(/window\.innerHeight/g, 'renderer.domElement.height')
                // Fix: Replace client coordinates with offset coordinates (relative to element)
                .replace(/\.clientX/g, '.offsetX')
                .replace(/\.clientY/g, '.offsetY');

            if (!enableAnimation) {
                sanitizedCode = sanitizedCode
                    .replace(/requestAnimationFrame\s*\(.*?\);/g, '// requestAnimationFrame disabled')
                    .replace(/renderer\.setAnimationLoop\s*\(.*?\);/g, '// setAnimationLoop disabled');
            }

            console.log("🚀 Executing sanitized Three.js code:", sanitizedCode);

            // Create a safe-ish function wrapper
            const userFunction = new Function('scene', 'camera', 'renderer', 'THREE', 'controls', sanitizedCode);
            userFunction(scene, camera, renderer, THREE, controls);
        } catch (err) {
            console.error("ThreeJS Execution Error:", err);
        }

        // 5. Animation Loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            controls.update(); // Required for damping
            renderer.render(scene, camera);
        };
        animate();

        // 5. Handle Resize with ResizeObserver
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            if (width === 0 || height === 0) return;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
        };

        const resizeObserver = new ResizeObserver(() => handleResize());
        resizeObserver.observe(containerRef.current);

        // Initial size check
        handleResize();

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(frameIdRef.current);
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            controls.dispose();
        };
    }, [code, enableAnimation]);

    return (
        <div className="relative w-full h-full group">
            <div ref={containerRef} className="w-full h-full overflow-hidden" />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                    onClick={() => setEnableAnimation(!enableAnimation)}
                    className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm transition-colors border border-white/10"
                    title={enableAnimation ? "Pause Animation" : "Play Animation"}
                >
                    {enableAnimation ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};

export default ThreeJSPreview;
