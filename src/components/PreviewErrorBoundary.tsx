import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class PreviewErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('🔴 PreviewErrorBoundary caught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-red-500/10 text-red-400 p-6 gap-4">
                    <AlertTriangle className="w-12 h-12" />
                    <div className="text-center">
                        <p className="font-semibold text-lg">Preview Failed</p>
                        <p className="text-sm opacity-75 mt-1">
                            {this.props.fallbackMessage || this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                    </div>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <details className="mt-4 text-xs opacity-50 max-w-md">
                            <summary className="cursor-pointer">Error Details</summary>
                            <pre className="mt-2 p-2 bg-black/20 rounded overflow-auto max-h-32">
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default PreviewErrorBoundary;
