import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Module from 'manifold-3d';

interface ManifoldPreviewProps {
    code: string;
}

const ManifoldPreview: React.FC<ManifoldPreviewProps> = ({ code }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const frameIdRef = useRef<number>(0);
    const controlsRef = useRef<OrbitControls | null>(null);
    const [wasmModule, setWasmModule] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Initialize WASM Module
    useEffect(() => {
        const initManifold = async () => {
            try {
                const wasm = await Module({
                    locateFile: () => '/manifold.wasm'
                });
                wasm.setup();
                setWasmModule(wasm);
                console.log("✅ Manifold WASM Initialized");
            } catch (err) {
                console.error("❌ Failed to initialize Manifold WASM:", err);
                setError("Failed to initialize 3D engine.");
            }
        };
        initManifold();
    }, []);

    useEffect(() => {
        if (!containerRef.current || !wasmModule) return;

        // 1. Setup Basic Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);

        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 5;
        camera.position.y = 2;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        containerRef.current.innerHTML = ''; // Clear previous
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 2. Add Helpers & Controls
        const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        scene.add(gridHelper);
        const axesHelper = new THREE.AxesHelper(2);
        scene.add(axesHelper);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controlsRef.current = controls;

        // 3. Add Lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // 4. Execute User Code & Render Mesh
        try {
            // Helper function to convert Manifold mesh to Three.js geometry
            const mesh2geometry = (mesh: any) => {
                const geometry = new THREE.BufferGeometry();

                // Vertices
                const vertices = new Float32Array(mesh.vertProperties);
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

                // Indices
                const indices = new Uint32Array(mesh.triVerts);
                geometry.setIndex(new THREE.BufferAttribute(indices, 1));

                geometry.computeVertexNormals();
                return geometry;
            };

            // We need a way to capture the result. 
            // Let's modify the code execution strategy slightly.
            // We'll expose a 'render' function that the user calls with their final manifold.

            const renderManifold = (manifoldObject: any) => {
                const mesh = manifoldObject.getMesh();
                const geometry = mesh2geometry(mesh);
                const material = new THREE.MeshStandardMaterial({
                    color: 0x00ff88,
                    metalness: 0.5,
                    roughness: 0.2,
                    flatShading: false
                });
                const threeMesh = new THREE.Mesh(geometry, material);
                scene.add(threeMesh);
                console.log("✅ Manifold object rendered");
            };

            // Helper wrappers for boolean operations to handle API variations
            const union = (a: any, b: any) => {
                if (a.union) return a.union(b);
                if (wasmModule.Manifold.union) return wasmModule.Manifold.union(a, b);
                if (a.add) return a.add(b); // Some versions use add for union
                throw new Error("union operation not found");
            };
            const difference = (a: any, b: any) => {
                if (a.difference) return a.difference(b);
                if (wasmModule.Manifold.difference) return wasmModule.Manifold.difference(a, b);
                if (a.subtract) return a.subtract(b);
                throw new Error("difference operation not found");
            };
            const intersection = (a: any, b: any) => {
                if (a.intersection) return a.intersection(b);
                if (wasmModule.Manifold.intersection) return wasmModule.Manifold.intersection(a, b);
                if (a.intersect) return a.intersect(b);
                throw new Error("intersection operation not found");
            };

            // Execute with exposed 'render' function and Manifold classes
            const runUserScript = new Function('manifold', 'render', 'Manifold', 'CrossSection', 'union', 'difference', 'intersection', code);
            runUserScript(wasmModule, renderManifold, wasmModule.Manifold, wasmModule.CrossSection, union, difference, intersection);

        } catch (err) {
            console.error("Manifold Execution Error:", err);
            setError(err instanceof Error ? err.message : String(err));
        }

        // 5. Animation Loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // 6. Resize Handler
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

        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(frameIdRef.current);
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            controls.dispose();
        };
    }, [code, wasmModule]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-red-500 bg-red-500/10 p-4 rounded-lg">
                <p>Error: {error}</p>
            </div>
        );
    }

    if (!wasmModule) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Initializing 3D Engine...</p>
            </div>
        );
    }

    return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
};

export default ManifoldPreview;
