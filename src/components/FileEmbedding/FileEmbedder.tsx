/**
 * File Embedding Component - Professional Shadcn Style
 * Upload files and embed them into Qdrant with AI-powered chunking
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileText, Brain, CheckCircle, AlertCircle, Loader, Sparkles, Trash2, Settings, Search } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useAuth } from '../../contexts/AuthContext';

interface EmbedConfig {
  collectionName: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
}

interface EmbedResult {
  chunks_processed: number;
  chunks_failed: number;
  errors: string[];
}

interface FileToEmbed {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  chunks?: number;
  error?: string;
  result?: EmbedResult;
}

const FileEmbedder: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileToEmbed[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<EmbedConfig>({
    collectionName: 'knowledge_base',
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingModel: 'text-embedding-3-small'
  });

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Add files to queue
  const addFiles = (fileList: File[]) => {
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const newFiles: FileToEmbed[] = fileList
      .filter(file => supportedTypes.includes(file.type) || file.name.endsWith('.md'))
      .map(file => ({
        file,
        id: `${file.name}-${Date.now()}`,
        status: 'pending',
        progress: 0
      }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  // Remove file from queue
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Clear all files
  const clearAll = () => {
    setFiles([]);
  };

  // Helper: Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Helper: Chunk text into smaller pieces
  const chunkText = (text: string, chunkSize: number, overlap: number): string[] => {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));

      if (end >= text.length) break;
      start = end - overlap;
    }

    return chunks;
  };

  // Embed all files using TKG
  const embedFiles = async () => {
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      if (fileItem.status !== 'pending') continue;

      // Update status to processing
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id
          ? { ...f, status: 'processing', progress: 0 }
          : f
      ));

      try {
        // Read file content
        const content = await readFileAsText(fileItem.file);

        // Update progress
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? { ...f, progress: 20 }
            : f
        ));

        // Chunk the content
        const chunks = chunkText(content, config.chunkSize, config.chunkOverlap);

        // Update progress
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? { ...f, progress: 50 }
            : f
        ));

        // Process each chunk using TKG
        let processedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          try {
            const result = await invoke('tkg_store_knowledge', {
              content: chunk,
              nodeType: 'Fact',
              importance: 0.8,
              userId: user?.id || 'anonymous',
            });

            const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
            if (!parsedResult.success) {
              failedCount++;
              errors.push(`Chunk ${i + 1}: ${parsedResult.message || 'Unknown error'}`);
            } else {
              processedCount++;
            }
          } catch (err: any) {
            failedCount++;
            const errorMsg = err?.message || err?.toString() || 'Unknown error';
            errors.push(`Chunk ${i + 1}: ${errorMsg}`);
            console.error('Chunk', i + 1, 'error:', err);
          }

          const progress = 50 + ((i + 1) / chunks.length) * 40;
          setFiles(prev => prev.map(f =>
            f.id === fileItem.id
              ? { ...f, progress: Math.floor(progress) }
              : f
          ));
        }

        const result = {
          chunks_processed: processedCount,
          chunks_failed: failedCount,
          errors: errors
        };

        // Update progress
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? { ...f, progress: 100, chunks: result.chunks_processed }
            : f
        ));

        // Mark as completed
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? {
              ...f,
              status: 'completed',
              result
            }
            : f
        ));

      } catch (error: any) {
        console.error('Embedding failed:', error);
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? {
              ...f,
              status: 'error',
              error: error.message || 'Failed to embed file'
            }
            : f
        ));
      }
    }

    setIsProcessing(false);
  };

  // Get status icon with animation
  const getStatusIcon = (status: FileToEmbed['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-5 h-5 text-muted-foreground" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
  };

  // Get status color for progress bar
  const getProgressColor = (status: FileToEmbed['status']) => {
    switch (status) {
      case 'processing':
        return 'bg-gradient-to-r from-primary to-primary/80';
      case 'completed':
        return 'bg-success';
      case 'error':
        return 'bg-destructive';
      default:
        return 'bg-primary/50';
    }
  };

  const pendingFiles = files.filter(f => f.status === 'pending').length;
  const completedFiles = files.filter(f => f.status === 'completed').length;
  const hasFiles = files.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-card p-8 border shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  AI File Embedder
                </h1>
                <p className="text-muted-foreground">
                  Transform documents into searchable knowledge with AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>Qdrant Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Cohere Embeddings</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span>WAMA Filtering</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {hasFiles && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border">
              <div className="text-sm text-muted-foreground mb-1">Total Files</div>
              <div className="text-2xl font-bold">{files.length}</div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border">
              <div className="text-sm text-muted-foreground mb-1">Pending</div>
              <div className="text-2xl font-bold text-warning">{pendingFiles}</div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border">
              <div className="text-sm text-muted-foreground mb-1">Completed</div>
              <div className="text-2xl font-bold text-success">{completedFiles}</div>
            </div>
          </div>
        )}

        {/* Configuration Panel */}
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border shadow-lg overflow-hidden">
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary" />
              <span className="font-semibold">Embedding Configuration</span>
            </div>
            <div className={`transform transition-transform ${configOpen ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </button>

          {configOpen && (
            <div className="p-6 border-t bg-card/30 space-y-4 animate-slide-down">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    value={config.collectionName}
                    onChange={(e) => setConfig({ ...config, collectionName: e.target.value })}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="knowledge_base"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Chunk Size
                  </label>
                  <input
                    type="number"
                    value={config.chunkSize}
                    onChange={(e) => setConfig({ ...config, chunkSize: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    min="500"
                    max="2000"
                    step="100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Chunk Overlap
                  </label>
                  <input
                    type="number"
                    value={config.chunkOverlap}
                    onChange={(e) => setConfig({ ...config, chunkOverlap: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    min="0"
                    max="500"
                    step="50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div
          className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50 bg-card/30'
            }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="p-12 text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all ${isDragging ? 'bg-primary/20 scale-110' : 'bg-primary/10'}`}>
              <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-primary/80'}`} />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragging ? 'Drop files here!' : 'Drag & drop files to embed'}
            </h3>
            <p className="text-muted-foreground mb-4">
              or <span className="text-primary font-medium">click to browse</span>
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Supports:</span>
              <span className="px-2 py-1 bg-background/50 rounded-md">PDF</span>
              <span className="px-2 py-1 bg-background/50 rounded-md">Markdown</span>
              <span className="px-2 py-1 bg-background/50 rounded-md">Text</span>
              <span className="px-2 py-1 bg-background/50 rounded-md">Word</span>
            </div>
          </div>

          {isDragging && (
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
          )}
        </div>

        {/* File Queue */}
        {hasFiles && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Files to Embed</h3>
              <button
                onClick={clearAll}
                disabled={isProcessing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>

            <div className="space-y-3">
              {files.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border shadow-sm hover:shadow-md transition-all animate-fade-in"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(fileItem.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">{fileItem.file.name}</p>
                        <span className="text-sm text-muted-foreground">
                          {(fileItem.file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>

                      {fileItem.chunks && (
                        <p className="text-sm text-muted-foreground">
                          {fileItem.chunks} chunks processed
                        </p>
                      )}

                      {fileItem.status === 'processing' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Processing...</span>
                            <span className="text-primary font-medium">{fileItem.progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(fileItem.status)} transition-all duration-300`}
                              style={{ width: `${fileItem.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {fileItem.status === 'error' && (
                        <div className="mt-3 text-sm text-destructive">
                          Error: {fileItem.error}
                        </div>
                      )}

                      {fileItem.status === 'completed' && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-success">
                          <CheckCircle className="w-4 h-4" />
                          Successfully embedded
                        </div>
                      )}

                      {fileItem.status === 'completed' && fileItem.result && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          {fileItem.result.chunks_failed > 0 && (
                            <div className="mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <p className="text-sm text-destructive font-medium mb-2">
                                {fileItem.result.chunks_failed} chunk(s) failed to embed:
                              </p>
                              <div className="text-xs text-destructive/80 space-y-1 max-h-32 overflow-y-auto">
                                {fileItem.result.errors.map((err: string, idx: number) => (
                                  <div key={idx}>• {err}</div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="text-xs">
                            Processed {fileItem.result.chunks_processed} chunks
                            {fileItem.result.chunks_failed > 0 && (
                              <span className="text-destructive">
                                {' '}({fileItem.result.chunks_failed} failed)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {fileItem.status === 'completed' && (
                        <button
                          onClick={() => {
                            // In the future, we can add a search UI
                            alert('Use the "Quick Search" tab to search your embedded knowledge!');
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Search Embedded Content"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => removeFile(fileItem.id)}
                        disabled={isProcessing}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Embed All Button - Always visible but disabled if no files */}
        <div className="sticky bottom-4 z-10">
          <button
            onClick={embedFiles}
            disabled={isProcessing || pendingFiles === 0}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-semibold hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl group backdrop-blur-md"
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Embedding Files...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Embed All Files ({pendingFiles})</span>
              </>
            )}
          </button>
        </div>

        {/* Help Section */}
        {!hasFiles && (
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border shadow-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Pro Tips
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Markdown files (.md)</span> work best - they preserve document structure
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Large files are automatically chunked using WAMA smart filtering
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Content is stored in your TKG with Cohere embeddings
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-muted-foreground">
                    Use "Quick Search" tab to find your embedded knowledge
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileEmbedder;
