import React, { useEffect, useRef, useState } from 'react';

interface MermaidRendererProps {
    code: string;
    className?: string;
}

declare global {
    interface Window {
        mermaid: any;
    }
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load mermaid from CDN if not already loaded
        if (!window.mermaid) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
            script.onload = () => {
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose',
                    fontFamily: 'inherit',
                });
                setIsLoaded(true);
            };
            script.onerror = () => setError('Failed to load Mermaid library');
            document.head.appendChild(script);
        } else {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (isLoaded && containerRef.current && code) {
            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                window.mermaid.render(id, code).then((result: any) => {
                    if (containerRef.current) {
                        containerRef.current.innerHTML = result.svg;
                    }
                });
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError('Failed to render diagram');
            }
        }
    }, [isLoaded, code]);

    if (error) {
        return (
            <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-lg text-red-500 text-sm">
                {error}
                <pre className="mt-2 text-xs opacity-70 overflow-x-auto">{code}</pre>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`mermaid-diagram overflow-x-auto p-4 bg-white/90 rounded-lg ${className}`}
        />
    );
};

export default MermaidRenderer;
