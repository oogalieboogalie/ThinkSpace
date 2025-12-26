import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Loader2, Search, FileText, Brain } from 'lucide-react';

export interface ResearchStep {
    step_type: 'planning' | 'searching' | 'analyzing' | 'synthesizing';
    description: string;
    details?: string;
}

interface DeepResearchPreviewProps {
    steps: ResearchStep[];
    isComplete: boolean;
}

export const DeepResearchPreview: React.FC<DeepResearchPreviewProps> = ({ steps, isComplete }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [steps]);

    const getIcon = (type: string, isLast: boolean, isComplete: boolean) => {
        if (isComplete) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        if (isLast) return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;

        switch (type) {
            case 'planning': return <Brain className="w-5 h-5 text-purple-500" />;
            case 'searching': return <Search className="w-5 h-5 text-blue-500" />;
            case 'analyzing': return <FileText className="w-5 h-5 text-yellow-500" />;
            case 'synthesizing': return <Brain className="w-5 h-5 text-green-500" />;
            default: return <Circle className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="bg-card/50 border border-border rounded-lg p-4 my-2 max-w-2xl w-full font-sans">
            <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">Deep Research Agent</h3>
                {isComplete ? (
                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full ml-auto">Completed</span>
                ) : (
                    <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full ml-auto animate-pulse">Active</span>
                )}
            </div>

            <div ref={scrollRef} className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {steps.map((step, index) => {
                    const isLast = index === steps.length - 1;
                    return (
                        <div key={index} className="flex gap-3 text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(step.step_type, isLast && !isComplete, isComplete && index < steps.length - 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium ${isLast && !isComplete ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {step.description}
                                </p>
                                {step.details && (
                                    <p className="text-xs text-muted-foreground/70 mt-0.5 truncate font-mono bg-muted/30 p-1 rounded">
                                        {step.details}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {steps.length === 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Initializing agent...
                    </div>
                )}
            </div>
        </div>
    );
};
