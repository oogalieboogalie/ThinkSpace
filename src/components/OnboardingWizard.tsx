import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, User, Palette, Check, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { invoke } from '@tauri-apps/api/tauri';

interface OnboardingWizardProps {
    onComplete: () => void;
}

const steps = [
    {
        id: 'welcome',
        title: 'Welcome to Cortex',
        description: 'Your AI-powered second brain.',
        icon: Sparkles,
    },
    {
        id: 'profile',
        title: 'Who are you?',
        description: 'Help the AI understand your context.',
        icon: User,
    },
    {
        id: 'theme',
        title: 'Pick your vibe',
        description: 'Customize your workspace.',
        icon: Palette,
    },
    {
        id: 'finish',
        title: 'All Set!',
        description: 'Ready to build something amazing?',
        icon: Check,
    },
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [currentStep, setCurrentStep] = useState(0);
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNext = async () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            await handleFinish();
        }
    };

    const handleFinish = async () => {
        setIsSubmitting(true);
        try {
            // 1. Save to localStorage for quick access
            localStorage.setItem('user_name', name);
            localStorage.setItem('user_bio', bio);
            localStorage.setItem('onboarding_complete', 'true');

            // 2. Save to TKG (Temporal Knowledge Graph)
            // We don't await this because if TKG isn't configured (no keys), it will fail/timeout.
            // We want the user to finish onboarding regardless.
            if (user?.id) {
                const knowledgeContent = `User Profile:\nName: ${name}\nBio/Goals: ${bio}\nPreferred Theme: ${theme}`;

                invoke('tkg_store_knowledge', {
                    content: knowledgeContent,
                    nodeType: 'FACT',
                    importance: 1.0,
                    userId: user.id,
                }).then(() => console.log('✅ Profile saved to TKG'))
                    .catch(e => console.warn('⚠️ Could not save to TKG (likely no keys yet):', e));
            }

            onComplete();
        } catch (error) {
            console.error('Onboarding error:', error);
            // Ensure we close even if something weird happens
            onComplete();
        } finally {
            setIsSubmitting(false);
        }
    };

    const themes = [
        { id: 'dark', name: 'Dark', color: '#09090b' },
        { id: 'light', name: 'Light', color: '#ffffff' },
        { id: 'ocean', name: 'Ocean', color: '#0f172a' },
        { id: 'sunset', name: 'Sunset', color: '#4a044e' },
        { id: 'forest', name: 'Forest', color: '#052e16' },
        { id: 'midnight', name: 'Midnight', color: '#000000' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="flex h-[500px]">
                    {/* Sidebar */}
                    <div className="w-1/3 bg-muted/30 p-8 border-r border-border/50 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-8">
                                <Brain className="w-6 h-6 text-primary" />
                                <span className="font-bold text-lg">Cortex</span>
                            </div>
                            <div className="space-y-6">
                                {steps.map((step, index) => {
                                    const Icon = step.icon;
                                    const isActive = index === currentStep;
                                    const isCompleted = index < currentStep;

                                    return (
                                        <div
                                            key={step.id}
                                            className={`flex items-center gap-3 transition-colors ${isActive ? 'text-primary' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/50'
                                                }`}
                                        >
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center border ${isActive
                                                    ? 'bg-primary/10 border-primary'
                                                    : isCompleted
                                                        ? 'bg-muted border-transparent'
                                                        : 'border-border'
                                                    }`}
                                            >
                                                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                            </div>
                                            <span className="font-medium text-sm">{step.title}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Step {currentStep + 1} of {steps.length}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 flex flex-col">
                        <div className="flex-1">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full flex flex-col justify-center"
                                >
                                    {currentStep === 0 && (
                                        <div className="text-center space-y-4">
                                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Sparkles className="w-10 h-10 text-primary" />
                                            </div>
                                            <h2 className="text-3xl font-bold">Welcome to Cortex</h2>
                                            <p className="text-muted-foreground text-lg">
                                                Let's set up your personalized AI workspace. It'll only take a minute.
                                            </p>
                                        </div>
                                    )}

                                    {currentStep === 1 && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <h2 className="text-2xl font-bold">Tell us about yourself</h2>
                                                <p className="text-muted-foreground">This helps Grok personalize its responses.</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">What should we call you?</label>
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="e.g. Alex"
                                                        className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">What are you working on?</label>
                                                    <textarea
                                                        value={bio}
                                                        onChange={(e) => setBio(e.target.value)}
                                                        placeholder="e.g. Building a SaaS, Learning Rust, Researching AI..."
                                                        className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all h-32 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 2 && (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <h2 className="text-2xl font-bold">Choose your theme</h2>
                                                <p className="text-muted-foreground">You can change this later in settings.</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                {themes.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => setTheme(t.id as any)}
                                                        className={`p-4 rounded-xl border text-left transition-all ${theme === t.id
                                                            ? 'border-primary ring-1 ring-primary bg-primary/5'
                                                            : 'border-border hover:border-primary/50'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-6 h-6 rounded-full border border-border/20 shadow-sm"
                                                                style={{ backgroundColor: t.color }}
                                                            />
                                                            <span className="font-medium">{t.name}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {currentStep === 3 && (
                                        <div className="text-center space-y-4">
                                            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Check className="w-10 h-10 text-success" />
                                            </div>
                                            <h2 className="text-3xl font-bold">You're all set!</h2>
                                            <p className="text-muted-foreground text-lg">
                                                Your profile has been saved to the Knowledge Graph. Grok is ready to help you build.
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleNext}
                                disabled={currentStep === 1 && !name.trim()}
                                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {currentStep === steps.length - 1 ? (
                                    isSubmitting ? 'Setting up...' : 'Get Started'
                                ) : (
                                    <>
                                        Next <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default OnboardingWizard;
