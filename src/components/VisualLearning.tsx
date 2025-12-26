import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { emit } from '@tauri-apps/api/event';
import { Image as ImageIcon, Loader2, Sparkles, BarChart3, Network, Workflow, Grid3X3, Search, MonitorPlay, ExternalLink, Code2, Palette } from 'lucide-react';


interface VisualLearningProps {
  apiKey: string;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  url: string; // URL for images, Code for mermaid
  timestamp: number;
  aspectRatio: string;
  type: string;
  style?: string;
}

type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9';

interface VisualType {
  id: string;
  name: string;
  icon: React.ReactNode;
  prompts: string[];
  description: string;
  defaultAspectRatio: AspectRatio;
  promptSuffix: string;
  isMermaid?: boolean;
}

const VisualLearning: React.FC<VisualLearningProps> = ({ apiKey }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>([]);
  const [selectedType, setSelectedType] = useState<string>('diagram');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [imageCount, setImageCount] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('default');

  const stylePresets = [
    { id: 'default', name: 'Default (Clean)', suffix: '' },
    { id: 'hand-drawn', name: 'Hand Drawn', suffix: 'hand drawn sketch style, pencil texture, rough edges, artistic' },
    { id: 'corporate', name: 'Corporate', suffix: 'corporate memphis style, flat vector, professional, minimal, blue and white' },
    { id: 'cyberpunk', name: 'Cyberpunk', suffix: 'cyberpunk aesthetic, neon colors, dark background, glowing lines, futuristic' },
    { id: 'minimalist', name: 'Minimalist', suffix: 'minimalist design, lots of whitespace, simple shapes, black and white' },
    { id: 'realistic', name: 'Photorealistic', suffix: 'photorealistic, 8k, highly detailed, cinematic lighting' },
  ];

  const visualTypes: VisualType[] = [
    {
      id: 'diagram',
      name: 'Diagrams',
      icon: <Network className="w-4 h-4" />,
      defaultAspectRatio: '16:9',
      description: 'Flowcharts, system diagrams, architecture',
      promptSuffix: 'educational infographic style, clean vector lines, professional diagram, clear labels, white background, high resolution, easy to understand',
      prompts: [
        'Simple flowchart: Plan → Code → Test → Deploy. Blue boxes with white text, black arrows, minimal design',
        'System architecture: 3-tier (Client, Server, Database). Gray rectangles connected by arrows, clean tech style',
        'Database ER diagram: 3 tables (Users, Posts, Comments) with primary/foreign keys, standard notation',
        'API flow: Client → Server → Database. Blue boxes, dotted lines for requests, solid for responses',
      ]
    },
    {
      id: 'slide',
      name: 'Slides',
      icon: <MonitorPlay className="w-4 h-4" />,
      defaultAspectRatio: '16:9',
      description: 'Presentation slides, title cards, agendas',
      promptSuffix: 'presentation slide design, professional powerpoint style, clean typography, modern layout, 16:9 aspect ratio, corporate memphis style, high quality',
      prompts: [
        'Title slide: "Startup Growth Strategy" in bold modern font, abstract geometric background, blue and purple gradient',
        'Agenda slide: 1. Market Analysis, 2. Product Roadmap, 3. Financials. Clean list layout with icons',
        'Team slide: Placeholders for 3 team members with circular frames, professional layout',
        'Quote slide: Large quotation marks, elegant serif font, minimal white background',
      ]
    },
    {
      id: 'chart',
      name: 'Charts',
      icon: <BarChart3 className="w-4 h-4" />,
      defaultAspectRatio: '16:9',
      description: 'Bar charts, line graphs, data visualization',
      promptSuffix: 'data visualization, clean chart, flat design, precise geometry, white background, professional business graphics',
      prompts: [
        'Bar chart: Q1-Q4 sales ($100k, $150k, $120k, $180k). Blue bars, white background, axis labels',
        'Line graph: Jan-Dec traffic (50→100 users). Green line, grid background, legend',
        'Pie chart: Market share (40%, 30%, 20%, 10%). 4 colored slices, percentage labels, clean',
        'Column chart: Language popularity (Python 35%, JS 30%, Java 20%, C# 15%). Colorful bars, title',
      ]
    },
    {
      id: 'mindmap',
      name: 'Mind Maps',
      icon: <Network className="w-4 h-4" />,
      defaultAspectRatio: '1:1',
      description: 'Concept relationships, branching ideas',
      promptSuffix: 'mind map illustration, central concept with branching nodes, colorful, creative, hand-drawn style, clear text hierarchy',
      prompts: [
        'React mind map: "React" center, 4 branches (Components, Hooks, State, Props), icons, colored text',
        'ML algorithms map: "Machine Learning" center, 3 branches (Supervised, Unsupervised, Reinforcement)',
        'ADHD strategies: "ADHD" center, 4 branches (Focus, Time, Memory, Energy) with 3 tips each',
        'Business model: "Startup" center, 9 sections (Value Prop, Customers, Revenue), sticky note style',
      ]
    },
    {
      id: 'process',
      name: 'Process Flow',
      icon: <Workflow className="w-4 h-4" />,
      defaultAspectRatio: '9:16',
      description: 'Step-by-step processes, workflows',
      promptSuffix: 'vertical process infographic, step-by-step guide style, numbered steps, clear icons, clean layout',
      prompts: [
        'Learn coding: 1.Choose Lang 2.Hello World 3.Basics 4.Projects 5.Portfolio. Vertical flowchart',
        'Task workflow: 1.Plan 2.Start 3.Focus 4.Review 5.Complete. Checkboxes, green/red status',
        'Code review: 1.Create PR 2.Team Review 3.Changes 4.Approval 5.Merge. Pentagon flowchart',
        'ADHD routine: Morning → Work → Break → Work → Evening. Clock icons, time labels',
      ]
    },
  ];

  const selectedTypeData = visualTypes.find(t => t.id === selectedType);

  const generateImage = async () => {
    if (!prompt.trim() || loading) return;

    if (!apiKey) {
      alert('Please enter your MiniMax API key in the sidebar first!');
      return;
    }

    setLoading(true);

    try {
      let resultUrl = '';
      // Generate Image
      const typeSuffix = selectedTypeData?.promptSuffix || 'educational style, clean design';
      const styleSuffix = stylePresets.find(s => s.id === selectedStyle)?.suffix || '';

      const enhancedPrompt = `${prompt.trim()}. ${typeSuffix}. ${styleSuffix}`;

      const params: any = {
        apiKey,
        prompt: enhancedPrompt,
      };

      if (aspectRatio) params.aspectRatio = aspectRatio;
      if (imageCount && imageCount > 1) params.n = imageCount;

      const imageUrl = await invoke<string>('generate_image_minimax', params);
      resultUrl = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;

      const newImage: GeneratedImage = {
        id: `${Date.now()}`,
        prompt: prompt.trim(),
        url: resultUrl,
        timestamp: Date.now(),
        aspectRatio,
        type: visualTypes.find(t => t.id === selectedType)?.name || 'Diagram',
        style: selectedStyle
      };

      const updatedSaved = [newImage, ...savedImages];
      setSavedImages(updatedSaved);
      localStorage.setItem('generatedImages', JSON.stringify(updatedSaved));

      setPrompt('');
    } catch (error) {
      console.error('Generation error:', error);
      alert(`Failed to generate: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  const handleDeleteImage = (imageId: string) => {
    setSavedImages(prevImages => {
      const updated = prevImages.filter(img => img.id !== imageId);
      localStorage.setItem('generatedImages', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSendToCanvas = async (image: GeneratedImage) => {
    try {
      const isMermaid = image.type === 'Mermaid';

      await emit('canvas-update', {
        block: {
          id: `img-${Date.now()}`,
          type: isMermaid ? 'code' : 'image',
          lang: isMermaid ? 'mermaid' : undefined,
          content: image.url, // For mermaid this is code, for image this is URL
          x: 100,
          y: 100,
          width: 400,
          height: 300,
        }
      });
      alert('Sent to Dojo Canvas!');
    } catch (error) {
      console.error('Failed to send to canvas:', error);
    }
  };

  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    const type = visualTypes.find(t => t.id === typeId);
    if (type) {
      setAspectRatio(type.defaultAspectRatio);
    }
  };

  // Load saved images on mount
  useEffect(() => {
    const saved = localStorage.getItem('generatedImages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedImages(parsed);
      } catch (error) {
        console.error('Failed to load saved images:', error);
      }
    }
  }, []);

  const filteredSavedImages = savedImages.filter(img =>
    img.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Left Panel - Generation Controls */}
      <div
        className="shrink-0 bg-card border-r border-border flex flex-col h-full overflow-hidden z-20 relative shadow-xl"
        style={{ width: '400px', minWidth: '400px' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Visual Learning</h2>
              <p className="text-xs text-muted-foreground">AI Image Generation</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Visual Type Selection */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Visual Type:</p>
            <div className="grid grid-cols-2 gap-2">
              {visualTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleTypeChange(type.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border transition-colors ${selectedType === type.id
                    ? 'bg-purple-500 border-purple-400 text-white'
                    : 'bg-muted/50 border-border text-foreground hover:bg-muted'
                    }`}
                >
                  {type.icon}
                  <span className="text-xs">{type.name}</span>
                </button>
              ))}
            </div>
            {selectedTypeData && (
              <p className="text-xs text-muted-foreground mt-1">{selectedTypeData.description}</p>
            )}
          </div>

          {/* Settings Row */}
          <div className="space-y-3">
            {/* Style Preset Dropdown */}
            {!selectedTypeData?.isMermaid && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Visual Style
                </label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {stylePresets.map(style => (
                    <option key={style.id} value={style.id}>{style.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="1:1">Square</option>
                  <option value="16:9">Widescreen</option>
                  <option value="4:3">Standard</option>
                  <option value="3:2">Photo</option>
                  <option value="9:16">Vertical</option>
                </select>
              </div>

              {!selectedTypeData?.isMermaid && (
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Count
                  </label>
                  <select
                    value={imageCount}
                    onChange={(e) => setImageCount(Number(e.target.value))}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={generateImage}
              disabled={loading || !prompt.trim()}
              className="w-full px-6 bg-purple-500 hover:bg-purple-600 disabled:bg-muted
                disabled:text-muted-foreground text-white rounded-lg transition-colors
                flex items-center justify-center gap-2 font-medium h-12 shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  {selectedTypeData?.isMermaid ? <Code2 className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  Generate {selectedTypeData?.isMermaid ? 'Diagram' : 'Image'}
                </>
              )}
            </button>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Describe what you want to visualize:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`E.g., "${selectedTypeData?.prompts[0]}"`}
              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg
                  focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Tip: Click examples below or write your own
          </p>

          {/* Example Prompts */}
          {selectedTypeData && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick Examples:</p>
              <div className="space-y-2">
                {selectedTypeData.prompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example)}
                    className="w-full text-left px-3 py-2 bg-muted/30 hover:bg-muted border border-border
                        rounded-lg text-xs text-foreground transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 bg-background/50 flex flex-col h-full overflow-hidden relative">
        {/* Gallery Header */}
        <div className="p-4 border-b border-border shrink-0 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Grid3X3 className="w-5 h-5" />
              Your Images ({filteredSavedImages.length})
            </h3>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your images..."
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Images Gallery */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredSavedImages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground mb-2">
                  {searchQuery ? 'No matching images' : 'No images yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Generate your first visual!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-20">
              {filteredSavedImages.map((image) => (
                <div
                  key={image.id}
                  className="group bg-card border border-border rounded-lg overflow-hidden
                    hover:border-primary transition-all duration-200 relative shadow-sm hover:shadow-md"
                >
                  <div className={`bg-muted flex items-center justify-center relative overflow-hidden ${image.aspectRatio === '1:1' ? 'aspect-square' :
                    image.aspectRatio === '16:9' ? 'aspect-video' :
                      image.aspectRatio === '9:16' ? 'aspect-[9/16]' :
                        'aspect-[4/3]'
                    }`}>
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                      onClick={() => window.open(image.url, '_blank')}
                    />

                    {/* Overlay Buttons */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSendToCanvas(image);
                        }}
                        className="p-3 bg-primary hover:bg-primary/90 rounded-full text-white shadow-lg transform hover:scale-110 transition-all duration-200"
                        title="Send to Canvas"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                        className="p-3 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transform hover:scale-110 transition-all duration-200"
                        title="Delete image"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-foreground truncate">{image.prompt}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {image.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(image.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualLearning;
