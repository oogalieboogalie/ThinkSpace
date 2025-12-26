import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface YouTubeEmbedProps {
    url: string;
    title?: string;
    className?: string;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ url, title = 'YouTube Video', className = '' }) => {
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setError(null);

        // Extract Video ID
        let videoId = '';

        try {
            if (url.includes('youtube.com/watch')) {
                const urlObj = new URL(url);
                videoId = urlObj.searchParams.get('v') || '';
            } else if (url.includes('youtu.be/')) {
                const parts = url.split('youtu.be/');
                videoId = parts[1]?.split('?')[0] || '';
            } else if (url.includes('youtube.com/embed/')) {
                const parts = url.split('youtube.com/embed/');
                videoId = parts[1]?.split('?')[0] || '';
            }

            if (videoId) {
                setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`);
            } else {
                setError('Could not extract video ID from URL');
            }
        } catch (e) {
            console.error('Failed to parse YouTube URL:', e);
            setError('Invalid YouTube URL');
        } finally {
            setLoading(false);
        }
    }, [url]);

    if (error) {
        return (
            <div className={`flex items-center justify-center h-full bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20 ${className}`}>
                <div className="text-center">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-medium text-sm">Video Error</p>
                    <p className="text-xs opacity-75 mt-1">{error}</p>
                    <p className="text-[10px] opacity-50 mt-2 truncate max-w-[200px]">{url}</p>
                </div>
            </div>
        );
    }

    if (loading || !embedUrl) {
        return (
            <div className={`flex items-center justify-center h-full bg-black/20 rounded-lg ${className}`}>
                <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full bg-black rounded-lg overflow-hidden border border-border/50 ${className}`}>
            <iframe
                src={embedUrl}
                title={title}
                className="absolute inset-0 w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
};

export default YouTubeEmbed;
