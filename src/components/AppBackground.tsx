import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import ThreeJSBackground from './ThreeJSBackground';

const AppBackground: React.FC = () => {
    const { theme, wallpaper } = useTheme();

    // Debug log
    React.useEffect(() => {
        console.log('AppBackground wallpaper:', wallpaper);
    }, [wallpaper]);

    if (wallpaper) {
        return (
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
                    style={{
                        backgroundImage: `url("${wallpaper}")`,
                    }}
                />
                <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Base Background */}
            <div
                className="absolute inset-0 transition-all duration-1000 ease-in-out"
                style={{
                    background: 'var(--background-gradient, rgb(var(--background)))',
                }}
            />

            {/* ThreeJS Background for Cosmic/Gielinor themes */}
            {theme === 'cosmic' && <ThreeJSBackground />}

            {/* Animated Orbs/Glows for texture - Only show if NOT soft theme AND NOT using ThreeJS */}
            {theme !== 'soft' && theme !== 'cosmic' && theme !== 'gielinor' && (
                <>
                    <motion.div
                        className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-30"
                        animate={{
                            x: [0, 50, 0],
                            y: [0, 30, 0],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{
                            background: 'radial-gradient(circle, rgba(var(--primary), 0.4) 0%, transparent 70%)',
                        }}
                    />

                    <motion.div
                        className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20"
                        animate={{
                            x: [0, -50, 0],
                            y: [0, -30, 0],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 2
                        }}
                        style={{
                            background: 'radial-gradient(circle, rgba(var(--accent), 0.4) 0%, transparent 70%)',
                        }}
                    />

                    {/* Grid Overlay for texture */}
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: `linear-gradient(rgba(var(--foreground), 0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(var(--foreground), 0.5) 1px, transparent 1px)`,
                            backgroundSize: '40px 40px'
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default AppBackground;
