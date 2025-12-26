import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface CascadeStep {
  depth: number;
  thought: string;
  triggered_thoughts: string[];
  confidence: number;
}

interface CascadeResult {
  success: boolean;
  trigger: string;
  final_synthesis: string;
  all_thoughts: string[];
  depths_explored: number;
  thoughts_processed: number;
  max_satisfaction: number;
  termination_reason: string;
  execution_time_ms: number;
  steps: CascadeStep[];
  message: string;
}

const CascadeBrainstorm: React.FC = () => {
  const [trigger, setTrigger] = useState('');
  const [maxDepth, setMaxDepth] = useState<number>(5);
  const [satisfactionThreshold, setSatisfactionThreshold] = useState<number>(0.9);
  const [beamWidth, setBeamWidth] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleCascade = async () => {
    if (!trigger.trim()) {
      setError('Please enter a brainstorming trigger');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await invoke<string>('tkg_cascade_brainstorm', {
        trigger,
        maxDepth,
        satisfactionThreshold,
        beamWidth,
      });

      const parsedResult = JSON.parse(response) as CascadeResult;
      setResult(parsedResult);
    } catch (err) {
      console.error('Cascade error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute cascade');
    } finally {
      setIsLoading(false);
    }
  };

  const getTerminationColor = (reason: string) => {
    switch (reason) {
      case 'satisfaction_reached':
        return 'text-green-600 bg-green-50';
      case 'max_depth_reached':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">🌊 RCA Cascade Brainstorming</h2>
        <p className="text-gray-600">
          Recursive Cascade Algorithm powered by Grok AI for deep creative exploration
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-md">
        <h3 className="text-xl font-semibold mb-4">Brainstorm Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trigger Input */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Brainstorming Trigger
            </label>
            <textarea
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="e.g., How to improve user engagement in mobile apps"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>

          {/* Max Depth */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Depth: {maxDepth}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Shallow (1)</span>
              <span>Deep (10)</span>
            </div>
          </div>

          {/* Satisfaction Threshold */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Satisfaction Threshold: {satisfactionThreshold.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.1"
              value={satisfactionThreshold}
              onChange={(e) => setSatisfactionThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Quick (0.5)</span>
              <span>Thorough (1.0)</span>
            </div>
          </div>

          {/* Beam Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Beam Width: {beamWidth}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={beamWidth}
              onChange={(e) => setBeamWidth(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Focused (1)</span>
              <span>Diverse (10)</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCascade}
          disabled={isLoading || !trigger.trim()}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          {isLoading ? '🌊 Cascading...' : '🌊 Start Cascade'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Results Panel */}
      {result && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-4">Cascade Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Depths Explored</div>
                <div className="text-2xl font-bold text-purple-600">{result.depths_explored}</div>
              </div>
              <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Thoughts Generated</div>
                <div className="text-2xl font-bold text-pink-600">{result.thoughts_processed}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Max Satisfaction</div>
                <div className="text-2xl font-bold text-blue-600">{(result.max_satisfaction * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Execution Time</div>
                <div className="text-2xl font-bold text-green-600">{result.execution_time_ms}ms</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Termination Reason:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTerminationColor(result.termination_reason)}`}>
                {result.termination_reason.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Final Synthesis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-4">Final Synthesis</h3>
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{result.final_synthesis}</pre>
            </div>
          </div>

          {/* All Thoughts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-4">All Generated Thoughts</h3>
            <div className="space-y-2">
              {result.all_thoughts.map((thought, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
                >
                  <span className="font-mono text-gray-400 mr-2">{index + 1}.</span>
                  {thought}
                </div>
              ))}
            </div>
          </div>

          {/* Cascade Steps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-4">Cascade Steps</h3>
            <div className="space-y-4">
              {result.steps.map((step, index) => (
                <div key={index} className="border-l-4 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-purple-600">Depth {step.depth}</span>
                    <span className="text-sm text-gray-500">
                      Confidence: {(step.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-2">{step.thought}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                    Triggered: {step.triggered_thoughts.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CascadeBrainstorm;
