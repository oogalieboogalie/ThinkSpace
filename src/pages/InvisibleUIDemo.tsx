import React, { useState } from 'react';
import InvisibleSidebar from '../components/InvisibleSidebar';
import ProximityButton from '../components/ProximityButton';
import { Sparkles, Zap, Palette, Brain, Star } from 'lucide-react';

const InvisibleUIDemo: React.FC = () => {
  const [currentView, setCurrentView] = useState('home');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>
      </div>

      {/* Invisible Sidebar */}
      <InvisibleSidebar onNavigate={setCurrentView} currentView={currentView} onOpenSettings={() => {}} />

      {/* Main Content */}
      <div className="relative z-10 p-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              INVISIBLE UI
            </h1>
            <p className="text-xl text-slate-400">
              Proximity-Based Quantum Interface Materialization
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
              <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
              <span className="text-purple-300 font-medium">Move cursor to LEFT EDGE to spawn sidebar</span>
            </div>
          </div>

          {/* Proximity Controls Section */}
          <div className="bg-black/40 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Brain className="w-7 h-7 text-purple-400" />
              Proximity Controls
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Demo Button 1 */}
              <div className="flex flex-col items-center space-y-4">
                <ProximityButton
                  icon={<Sparkles className="w-7 h-7 text-white" />}
                  label="AI Controls"
                  proximityRadius={120}
                >
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white">AI Assistant Panel</h3>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 rounded-lg text-white transition-colors">
                        Generate Content
                      </button>
                      <button className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 rounded-lg text-white transition-colors">
                        Analyze Data
                      </button>
                      <button className="w-full px-4 py-2 bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 rounded-lg text-white transition-colors">
                        Create Images
                      </button>
                    </div>
                  </div>
                </ProximityButton>
                <p className="text-sm text-slate-400 text-center">
                  Hover near the button to spawn AI controls
                </p>
              </div>

              {/* Demo Button 2 */}
              <div className="flex flex-col items-center space-y-4">
                <ProximityButton
                  icon={<Palette className="w-7 h-7 text-white" />}
                  label="Theme Studio"
                  proximityRadius={120}
                >
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white">Theme Customizer</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {['Purple', 'Blue', 'Green', 'Pink', 'Orange'].map((color) => (
                        <button
                          key={color}
                          className="w-full aspect-square rounded-lg border-2 border-white/20 hover:border-white/60 transition-colors"
                          style={{
                            background: `linear-gradient(135deg, ${
                              color === 'Purple' ? '#a855f7' :
                              color === 'Blue' ? '#3b82f6' :
                              color === 'Green' ? '#10b981' :
                              color === 'Pink' ? '#ec4899' :
                              '#f97316'
                            }, ${
                              color === 'Purple' ? '#7c3aed' :
                              color === 'Blue' ? '#2563eb' :
                              color === 'Green' ? '#059669' :
                              color === 'Pink' ? '#db2777' :
                              '#ea580c'
                            })`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </ProximityButton>
                <p className="text-sm text-slate-400 text-center">
                  Approach to access theme controls
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-black/40 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/40 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">1</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Proximity Detection</h3>
                <p className="text-slate-400 text-sm">
                  The system continuously tracks your cursor position relative to UI elements using advanced spatial algorithms.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">2</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Quantum Materialization</h3>
                <p className="text-slate-400 text-sm">
                  When you enter the proximity radius, UI elements materialize from quantum state with smooth animations.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-pink-500/20 border border-pink-500/40 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">3</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Spatial Interaction</h3>
                <p className="text-slate-400 text-sm">
                  Floating controls spawn exactly where you're approaching from, creating intuitive spatial relationships.
                </p>
              </div>
            </div>
          </div>

          {/* Feature Showcase */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6">
              <Star className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Invisible Sidebar</h3>
              <p className="text-slate-400">
                Move your cursor to the <strong>left edge</strong> of your screen to spawn a fully functional sidebar interface. It materializes from thin air with gradient backgrounds and smooth transitions.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
              <Zap className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Floating Controls</h3>
              <p className="text-slate-400">
                Approach any <strong>proximity button</strong> to spawn context-aware floating panels with relevant controls. Perfect for power users who want instant access to tools.
              </p>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-black/40 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Technical Implementation</h2>
            <div className="space-y-4 font-mono text-sm">
              <div className="flex items-start gap-3">
                <span className="text-purple-400">▶</span>
                <div>
                  <strong className="text-white">useProximity Hook:</strong>
                  <span className="text-slate-400"> Calculates cursor distance and spawns UI at optimal positions</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400">▶</span>
                <div>
                  <strong className="text-white">CSS Transformations:</strong>
                  <span className="text-slate-400"> Smooth materialization with cubic-bezier easing and blur effects</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-pink-400">▶</span>
                <div>
                  <strong className="text-white">Backdrop Filters:</strong>
                  <span className="text-slate-400"> Glass morphism effects with blur and opacity for futuristic look</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-cyan-400">▶</span>
                <div>
                  <strong className="text-white">Spatial Positioning:</strong>
                  <span className="text-slate-400"> Dynamic spawn points calculated from cursor angle and velocity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center py-12">
            <p className="text-slate-400 mb-6">
              This is just the beginning. Imagine entire applications built with invisible UI.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full text-white font-bold hover:scale-105 transition-transform cursor-pointer">
              <Sparkles className="w-5 h-5" />
              The Future of Interaction Design
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvisibleUIDemo;
