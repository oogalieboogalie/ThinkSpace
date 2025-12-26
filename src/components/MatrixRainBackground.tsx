import React, { useRef, useEffect } from 'react';

interface MatrixRainBackgroundProps {
    className?: string;
}

const MatrixRainBackground: React.FC<MatrixRainBackgroundProps> = ({ className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Matrix rain configuration
        const fontSize = 14;
        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ';
        const columns = Math.floor(canvas.width / fontSize);
        const drops: number[] = Array(columns).fill(1);

        // Animation loop
        const draw = () => {
            // Semi-transparent black to create fade effect
            ctx.fillStyle = 'rgba(0, 10, 5, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Green matrix text
            ctx.fillStyle = '#00ff88';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                // Reset drop randomly after it falls off screen
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                } else {
                    drops[i]++;
                }
            }
        };

        const intervalId = setInterval(draw, 50);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 pointer-events-none ${className}`}
            style={{ zIndex: 0 }}
        />
    );
};

export default MatrixRainBackground;
