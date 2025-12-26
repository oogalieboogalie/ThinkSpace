import React from 'react';
import { motion } from 'framer-motion';

const HeroBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden -z-10 bg-background">
            {/* Main Gradient Mesh */}
            <div className="absolute inset-0 opacity-30 dark:opacity-20">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/40 via-accent/20 to-transparent blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [0, -90, 0],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-[50%] -right-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-secondary/40 via-purple-500/20 to-transparent blur-3xl"
                />
            </div>

            {/* Floating Particles/Orbs */}
            <div className="absolute inset-0">
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                        }}
                        animate={{
                            x: [
                                Math.random() * window.innerWidth,
                                Math.random() * window.innerWidth,
                                Math.random() * window.innerWidth,
                            ],
                            y: [
                                Math.random() * window.innerHeight,
                                Math.random() * window.innerHeight,
                                Math.random() * window.innerHeight,
                            ],
                        }}
                        transition={{
                            duration: 20 + Math.random() * 10,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                        className="absolute w-64 h-64 bg-primary/10 rounded-full blur-3xl mix-blend-screen"
                    />
                ))}
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)" />

            {/* Vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />
        </div>
    );
};

export default HeroBackground;
