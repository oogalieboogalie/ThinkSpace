import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { emitEvent as emit } from '../lib/events';
import { openExternal } from '../lib/tauri-bridge';
import { useTheme } from '../contexts/ThemeContext';
import MermaidRenderer from './MermaidRenderer';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Collapsible wrapper for long code blocks
const CollapsibleCodeBlock: React.FC<{
  children: React.ReactNode;
  codeContent: string;
  maxLines?: number;
  isGielinor?: boolean;
}> = ({ children, codeContent, maxLines = 8, isGielinor = false }) => {
  const [expanded, setExpanded] = useState(false);
  const lineCount = codeContent.split('\n').length;
  const shouldCollapse = lineCount > maxLines;
  const fadeStyle = isGielinor
    ? { backgroundImage: 'linear-gradient(to top, #0b1321, transparent)' }
    : { backgroundImage: 'linear-gradient(to top, rgba(var(--card), 0.95), transparent)' };
  const buttonStyle = isGielinor
    ? { color: '#ffb400', backgroundColor: '#0b1321', borderTopColor: 'rgba(140, 100, 20, 0.2)' }
    : { color: 'rgb(var(--foreground))', backgroundColor: 'rgba(var(--card), 0.8)', borderTopColor: 'rgba(var(--border), 0.4)' };

  if (!shouldCollapse) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div
        className={`overflow-hidden transition-all duration-300 ${expanded ? '' : 'max-h-[120px]'}`}
      >
        {children}
        {!expanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
            style={fadeStyle}
          />
        )}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 text-xs flex items-center justify-center gap-1 border-t transition-colors hover:opacity-90"
        style={buttonStyle}
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            Show more ({lineCount} lines)
          </>
        )}
      </button>
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: 'default' | 'notebook';
  canvasId?: 'main' | 'left';
}



const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  variant = 'default',
  canvasId = 'main',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'cosmic' || theme === 'hawkeye' || theme === 'gielinor';
  const isGielinor = theme === 'gielinor';
  const useRuneScapeStyle = isGielinor && variant !== 'notebook';

  return (
    <div className={`
      prose prose-sm max-w-none 
      ${isDark ? 'prose-invert' : ''}
      ${variant === 'notebook' ? 'notebook-paper' : ''}
      ${className}
      ${useRuneScapeStyle ? 'font-mono text-[#ffff00] drop-shadow-[1px_1px_0_rgba(0,0,0,1)]' : ''}
      ${useRuneScapeStyle ? 'prose-strong:text-[#ffff00] prose-headings:text-[#ffff00] prose-li:text-[#ffff00] prose-ol:text-[#ffff00] prose-ul:text-[#ffff00]' : ''}
      ${useRuneScapeStyle ? 'prose-p:text-[#ffff00] prose-a:text-[#ffff00] prose-blockquote:text-[#ffff00] prose-blockquote:border-[#ffff00]' : ''}
    `} style={{ fontFamily: useRuneScapeStyle ? '"RuneScape UF", "Press Start 2P", ui-monospace, monospace' : undefined }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            const href = typeof props.href === 'string' ? props.href : '';
            const normalizedHref = href.startsWith('www.') ? `https://${href}` : href;
            const isHttp = /^https?:\/\//i.test(normalizedHref);
            const isMailto = /^mailto:/i.test(normalizedHref);
            const isSafe = isHttp || isMailto;

            return (
              <a
                {...props}
                href={normalizedHref}
                onClick={(e) => {
                  if (!isSafe) return;
                  e.preventDefault();

                  const openExternally = e.ctrlKey || e.metaKey || e.shiftKey;
                  if (openExternally || isMailto) {
                    openExternal(normalizedHref).catch((err) => console.error('Failed to open link externally:', err));
                    return;
                  }

                  // Detect YouTube links
                  const isYouTube = normalizedHref.includes('youtube.com') || normalizedHref.includes('youtu.be');
                  const type = isYouTube ? 'youtube' : 'url';

                  emit('canvas-split', { url: normalizedHref, type, targetId: canvasId }).catch((err) =>
                    console.error('Failed to open link in canvas media pane:', err)
                  );
                }}
                title={normalizedHref}
              >
                {props.children}
              </a>
            );
          },
          // Custom image component with loading and error handling
          img: ({ node, ...props }) => {
            return (
              <span className="block my-4">
                <img
                  {...props}
                  className="rounded-lg border border-border max-w-full h-auto block"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Image failed to load:', props.src);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {props.alt && (
                  <span className="block text-xs text-muted-foreground mt-1 text-center">
                    {props.alt}
                  </span>
                )}
              </span>
            );
          },
          // Custom heading styles
          h4: ({ node, ...props }) => {
            const bulletStyle = isGielinor ? { backgroundColor: '#ffb400' } : { backgroundColor: 'rgb(var(--accent))' };
            return (
              <h4 className="text-lg font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={bulletStyle}></span>
                {props.children}
              </h4>
            );
          },
          h5: ({ node, ...props }) => {
            return (
              <h5 className="text-md font-semibold text-foreground mt-4 mb-2">
                {props.children}
              </h5>
            );
          },

          // Custom code block styles
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');

            if (!inline && lang === 'mermaid') {
              return <MermaidRenderer code={codeContent} />;
            }

            // Languages that can be previewed in canvas
            const previewableLanguages = ['html', 'htm', 'javascript', 'js', 'css', 'svg'];

            // Auto-detect HTML content even if no language specified
            const looksLikeHtml = !lang && (
              codeContent.trim().toLowerCase().startsWith('<!doctype') ||
              codeContent.trim().toLowerCase().startsWith('<html') ||
              codeContent.trim().toLowerCase().startsWith('<head') ||
              codeContent.trim().toLowerCase().startsWith('<body') ||
              (codeContent.includes('<style>') && codeContent.includes('</style>')) ||
              (codeContent.includes('<script>') && codeContent.includes('</script>'))
            );

            const effectiveLang = lang || (looksLikeHtml ? 'html' : '');

            // TSX/JSX/TS can't be previewed - they need React/build tools
            const nonPreviewableLanguages = ['tsx', 'jsx', 'ts', 'typescript'];
            const isNonPreviewable = nonPreviewableLanguages.includes(effectiveLang.toLowerCase());

            // Add manifold to previewable languages
            const isManifold = effectiveLang.toLowerCase() === 'manifold' ||
              (effectiveLang.toLowerCase() === 'javascript' && (
                codeContent.includes('Manifold.') ||
                codeContent.includes('render(') && codeContent.includes('.cylinder')
              ));

            const isPreviewable = !inline && !isNonPreviewable && (
              previewableLanguages.includes(effectiveLang.toLowerCase()) ||
              looksLikeHtml ||
              isManifold
            );

            const handlePreviewInCanvas = () => {
              // Route manifold code to manifold preview
              if (isManifold) {
                emit('canvas-split', {
                  code: codeContent,
                  type: 'manifold',
                  targetId: canvasId
                }).catch((err) => console.error('Failed to preview Manifold in canvas:', err));
                return;
              }

              let htmlContent = codeContent;

              // Wrap JS/CSS in HTML if needed
              if (effectiveLang.toLowerCase() === 'javascript' || effectiveLang.toLowerCase() === 'js') {
                htmlContent = `<!DOCTYPE html>
<html>
<head><title>JS Preview</title></head>
<body>
<script>${codeContent}</script>
</body>
</html>`;
              } else if (effectiveLang.toLowerCase() === 'css') {
                htmlContent = `<!DOCTYPE html>
<html>
<head><style>${codeContent}</style></head>
<body><div id="demo">CSS Preview - Add HTML elements to see styles</div></body>
</html>`;
              } else if (effectiveLang.toLowerCase() === 'svg') {
                htmlContent = `<!DOCTYPE html>
<html>
<head><title>SVG Preview</title><style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;}</style></head>
<body>${codeContent}</body>
</html>`;
              }

              emit('canvas-split', {
                code: htmlContent,
                type: 'html',
                targetId: canvasId
              }).catch((err) => console.error('Failed to preview in canvas:', err));
            };

            // Show header if we have a language OR if it's previewable (auto-detected)
            const showHeader = lang || isPreviewable;
            const codeContainerStyle = useRuneScapeStyle
              ? { borderColor: 'rgba(140, 100, 20, 0.4)', backgroundColor: '#0b1321' }
              : { borderColor: 'rgba(var(--border), 0.4)', backgroundColor: 'rgba(var(--card), 0.7)' };
            const headerStyle = useRuneScapeStyle
              ? { backgroundColor: 'rgba(140, 100, 20, 0.1)', borderBottomColor: 'rgba(140, 100, 20, 0.2)' }
              : { backgroundColor: 'rgba(var(--muted), 0.4)', borderBottomColor: 'rgba(var(--border), 0.4)' };
            const labelStyle = useRuneScapeStyle
              ? { color: '#ffb400' }
              : { color: 'rgb(var(--muted-foreground))' };
            const previewButtonStyle = useRuneScapeStyle
              ? { backgroundColor: 'rgba(255, 180, 0, 0.2)', color: '#ffb400' }
              : { backgroundColor: 'rgba(var(--accent), 0.25)', color: 'rgb(var(--accent-foreground))' };
            const dotStyle = useRuneScapeStyle
              ? { backgroundColor: 'rgba(255, 180, 0, 0.2)' }
              : { backgroundColor: 'rgba(var(--accent), 0.35)' };
            const codeTextStyle = useRuneScapeStyle
              ? { color: '#ffff00' }
              : { color: 'rgb(var(--foreground))' };
            const inlineCodeStyle = useRuneScapeStyle
              ? { backgroundColor: 'rgba(140, 100, 20, 0.1)', color: '#ffb400', borderColor: 'rgba(140, 100, 20, 0.2)' }
              : { backgroundColor: 'rgba(var(--muted), 0.35)', color: 'rgb(var(--foreground))', borderColor: 'rgba(var(--border), 0.4)' };

            return !inline ? (
              <CollapsibleCodeBlock codeContent={codeContent} isGielinor={useRuneScapeStyle}>
                <div className="my-4 rounded-lg border overflow-hidden shadow-sm" style={codeContainerStyle}>
                  {showHeader && (
                    <div className="flex items-center justify-between px-4 py-2 border-b" style={headerStyle}>
                      <span className="text-xs font-medium uppercase tracking-wider" style={labelStyle}>
                        {lang || (looksLikeHtml ? 'html (detected)' : 'code')}
                      </span>
                      <div className="flex items-center gap-3">
                        {isPreviewable && (
                          <button
                            onClick={handlePreviewInCanvas}
                            className="text-xs px-2 py-1 rounded transition-colors hover:opacity-90"
                            title="Preview this code in the canvas"
                            style={previewButtonStyle}
                          >
                            ▶ Preview
                          </button>
                        )}
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={dotStyle}></div>
                          <div className="w-2.5 h-2.5 rounded-full" style={dotStyle}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <pre className="p-4 overflow-x-auto bg-transparent">
                    <code className={`${className} font-mono text-sm`} style={codeTextStyle} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              </CollapsibleCodeBlock>
            ) : (
              <code
                className={`${className} px-1.5 py-0.5 rounded-md font-medium border`}
                style={inlineCodeStyle}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => {
            // Pass through for the code component to handle
            return <>{props.children}</>;
          },
          // Custom blockquote
          blockquote: ({ node, ...props }) => {
            const quoteBorderStyle = isGielinor ? { borderColor: '#ffb400' } : { borderColor: 'rgb(var(--accent))' };
            return (
              <blockquote className="border-l-4 pl-4 py-2 my-4 bg-card rounded-r-lg" style={quoteBorderStyle}>
                {props.children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div >
  );
};

export default MarkdownRenderer;
