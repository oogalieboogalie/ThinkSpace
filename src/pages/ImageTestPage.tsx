import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Image, Sparkles, BookOpen, Download, Loader2 } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';

interface ImageTestPageProps {
  apiKey: string;
}

const ImageTestPage: React.FC<ImageTestPageProps> = ({ apiKey }) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [visualOutput, setVisualOutput] = useState<any>(null);
  const [selectedTest, setSelectedTest] = useState<'simple' | 'visual'>('simple');

  const testImageGeneration = async (prompt: string) => {
    setLoading(true);
    setImageUrl('');
    setVisualOutput(null);

    try {
      const url: string = await invoke('generate_image_minimax', {
        apiKey,
        prompt
      });
      setImageUrl(url);
    } catch (err) {
      console.error('Generation failed:', err);
      alert('Failed to generate image. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const testVisualStoryteller = async () => {
    setLoading(true);
    setImageUrl('');
    setVisualOutput(null);

    try {
      // This would use the enhanced visual storyteller
      // For now, simulate it
      const mockOutput = {
        mentalModel: "React hooks are like special tools that let you 'hook into' React features",
        analogies: [
          "Like attaching a tool to a Swiss Army knife",
          "Like adding superpowers to a character"
        ],
        diagram: `
React Component
    |
    |-- useState (for data)
    |
    |-- useEffect (for actions)
    |
    \-- useContext (for sharing)
        `,
        imagePrompt: "Simple diagram showing React hooks as tools attached to a component, educational style"
      };
      setVisualOutput(mockOutput);

      // Generate image
      const url: string = await invoke('generate_image_minimax', {
        apiKey,
        prompt: mockOutput.imagePrompt
      });
      setImageUrl(url);
    } catch (err) {
      console.error('Test failed:', err);
      alert('Failed to run test');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!imageUrl) return;

    try {
      await invoke('download_image', {
        url: imageUrl,
        filename: `test-image-${Date.now()}.png`
      });
      alert('Image downloaded!');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            Image Generation Test Page
          </h1>
          <p className="text-slate-400">
            Test MiniMax image generation with your API key
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Test Controls</h2>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTest('simple')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedTest === 'simple'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Simple Test
                </button>
                <button
                  onClick={() => setSelectedTest('visual')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedTest === 'visual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Visual Storyteller
                </button>
              </div>

              {selectedTest === 'simple' && (
                <button
                  onClick={() => testImageGeneration(
                    "A simple diagram of the water cycle, educational style, clean white background, labeled"
                  )}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Image className="w-5 h-5" />
                      Test: Water Cycle Diagram
                    </>
                  )}
                </button>
              )}

              {selectedTest === 'visual' && (
                <button
                  onClick={testVisualStoryteller}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5" />
                      Test: Visual Storyteller (React Hooks)
                    </>
                  )}
                </button>
              )}

              {imageUrl && (
                <button
                  onClick={downloadImage}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Image
                </button>
              )}
            </div>

            <div className="mt-6 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">API Status</h3>
              <p className="text-xs text-slate-400">
                Using API key: {apiKey ? '✅ Configured' : '❌ Not set'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Endpoint: api.minimaxi.com
              </p>
            </div>
          </div>

          {/* Output */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Output</h2>

            {!imageUrl && !loading && (
              <div className="text-slate-400 text-center py-12">
                Click a test button to generate an image
              </div>
            )}

            {loading && (
              <div className="text-slate-400 text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                Generating image with MiniMax API...
              </div>
            )}

            {imageUrl && (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Generated by MiniMax"
                    className="w-full rounded-lg border border-slate-600"
                  />
                </div>

                <div className="text-xs text-slate-400 break-all">
                  Image URL: {imageUrl}
                </div>

                {visualOutput && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-white mb-2">Visual Storyteller Output:</h3>
                    <MarkdownRenderer
                      content={`
### Mental Model
${visualOutput.mentalModel}

### Analogies
${visualOutput.analogies.map((a: string) => `- ${a}`).join('\n')}

### Diagram
\`\`\`
${visualOutput.diagram}
\`\`\`

### Generated Image
![Visual](${imageUrl})
                      `}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">How It Works</h2>
          <div className="text-slate-300 space-y-2 text-sm">
            <p>✅ <strong>Backend</strong>: Your Rust code in `minimax_api.rs` has the `generate_image_minimax` function</p>
            <p>✅ <strong>Frontend</strong>: Components use invoke to call it</p>
            <p>✅ <strong>API</strong>: Uses your same MiniMax API key from Settings</p>
            <p>✅ <strong>Output</strong>: Returns a URL to display the image directly</p>
            <p>✅ <strong>Storage</strong>: Use `download_image` to save to disk</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageTestPage;
