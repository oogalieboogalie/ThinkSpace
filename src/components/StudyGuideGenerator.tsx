import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { BookOpen, Sparkles, Download, Loader2, CheckCircle, Brain, Target, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StudyGuideGeneratorProps {
  apiKey: string;
  onSendToCanvas?: (content: string, target?: 'main' | 'left') => void;
}

const StudyGuideGenerator: React.FC<StudyGuideGeneratorProps> = ({ apiKey, onSendToCanvas }) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [includeResources, setIncludeResources] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generatedGuide, setGeneratedGuide] = useState('');
  const [error, setError] = useState('');

  const generateGuide = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (!apiKey) {
      setError('Please configure your API key in settings');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedGuide('');

    try {
      const guide = await invoke<string>('create_study_guide_enhanced', {
        apiKey,
        topic: topic.trim(),
        difficulty,
        includeResources,
      });

      setGeneratedGuide(guide);
      if (onSendToCanvas) {
        onSendToCanvas(guide);
      }
    } catch (err) {
      setError(`Failed to generate study guide: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadGuide = () => {
    if (!generatedGuide) return;

    const blob = new Blob([generatedGuide], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-guide-${topic.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const templates = [
    {
      name: 'Rust Programming',
      difficulty: 'beginner' as const,
      icon: '🦀',
    },
    {
      name: 'Tauri Desktop Development',
      difficulty: 'intermediate' as const,
      icon: '🖥️',
    },
    {
      name: 'ADHD Study Strategies',
      difficulty: 'beginner' as const,
      icon: '🧠',
    },
    {
      name: 'MiniMax AI Integration',
      difficulty: 'intermediate' as const,
      icon: '🤖',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary to-accent p-2 rounded-lg">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Study Guide Generator</h2>
            <p className="text-xs text-muted-foreground">AI-powered personalized learning guides</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Generator Form */}
          {!generatedGuide && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Create Your Study Guide
                </h3>

                {/* Topic Input */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground font-medium">
                    What do you want to learn?
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Rust Programming, Machine Learning, ADHD Strategies..."
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg
                      focus:outline-none focus:border-primary text-foreground"
                    disabled={loading}
                  />
                </div>

                {/* Difficulty */}
                <div className="space-y-2 mt-4">
                  <label className="text-sm text-foreground font-medium">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        disabled={loading}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          difficulty === level
                            ? 'bg-purple-500/20 border-primary text-primary'
                            : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <div className="text-sm font-medium capitalize">{level}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="mt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeResources}
                      onChange={(e) => setIncludeResources(e.target.checked)}
                      disabled={loading}
                      className="w-5 h-5 rounded border-border text-purple-500
                        focus:ring-purple-500 focus:ring-offset-slate-800"
                    />
                    <span className="text-sm text-foreground">
                      Include resources and practice exercises
                    </span>
                  </label>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateGuide}
                  disabled={loading || !topic.trim()}
                  className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-primary to-accent
                    hover:from-primary hover:to-accent disabled:from-muted disabled:to-muted
                    disabled:text-muted-foreground text-white rounded-lg font-medium transition-all
                    flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating your personalized study guide...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate Study Guide</span>
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
              </div>

              {/* Quick Templates */}
              <div className="pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Quick Templates
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTopic(template.name);
                        setDifficulty(template.difficulty);
                      }}
                      disabled={loading}
                      className="p-3 bg-background hover:bg-muted border border-border
                        hover:border-primary/50 rounded-lg text-left transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {template.name}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {template.difficulty}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generated Guide Display */}
          {generatedGuide && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30
                rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-400">
                      Study Guide Generated!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Topic: {topic} • Level: {difficulty}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={downloadGuide}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg
                      font-medium transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedGuide('');
                      setTopic('');
                      setError('');
                    }}
                    className="px-4 py-2 bg-muted hover:bg-muted/60 text-foreground rounded-lg
                      font-medium transition-colors text-sm"
                  >
                    New Guide
                  </button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {generatedGuide}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Features Info */}
          {!generatedGuide && !loading && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="bg-purple-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  ADHD-Optimized
                </h4>
                <p className="text-xs text-muted-foreground">
                  Structured for hyperfocus sessions with clear milestones
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="bg-blue-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  Goal-Oriented
                </h4>
                <p className="text-xs text-muted-foreground">
                  Clear learning objectives and measurable outcomes
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="bg-green-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-green-400" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  Practical Resources
                </h4>
                <p className="text-xs text-muted-foreground">
                  Includes exercises, projects, and assessment strategies
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyGuideGenerator;
