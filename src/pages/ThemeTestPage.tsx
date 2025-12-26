import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeTestPage: React.FC = () => {
  const { theme, setTheme, toggleTheme } = useTheme();

  const themes = [
    { id: 'dark', name: 'Dark', color: 'slate' },
    { id: 'light', name: 'Light', color: 'yellow' },
    { id: 'cosmic', name: 'Cosmic', color: 'indigo' },
    { id: 'cream', name: 'Cream', color: 'amber' },
    { id: 'soft', name: 'Soft', color: 'gray' },
    { id: 'hawkeye', name: 'Hawkeye', color: 'yellow' },
  ] as const;

  return (
    <div className="p-8 bg-slate-900 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-200">Theme System Test Page</h1>
          <p className="text-slate-400">Current theme: <span className="font-semibold">{theme}</span></p>
          <button
            onClick={toggleTheme}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium"
          >
            Quick Toggle (Cycle Themes)
          </button>
        </div>

        {/* Theme Selector */}
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Select a Theme</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-lg transition-all ${
                  theme === t.id
                    ? 'ring-2 ring-purple-500 scale-105'
                    : 'hover:scale-102'
                }`}
                style={{
                  backgroundColor: `rgb(var(--bg-secondary))`,
                  border: `1px solid rgb(var(--border-color))`,
                }}
              >
                <div className={`w-8 h-8 rounded-full bg-${t.color}-500 mx-auto mb-2`} />
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                  {t.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Test Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: CSS Variables */}
          <div
            style={{
              backgroundColor: 'rgb(var(--bg-secondary))',
              color: 'rgb(var(--text-primary))',
              border: '1px solid rgb(var(--border-color))',
            }}
            className="p-6 rounded-lg"
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'rgb(var(--text-primary))' }}>
              CSS Custom Properties
            </h3>
            <p className="text-sm mb-4" style={{ color: 'rgb(var(--text-secondary))' }}>
              This card uses CSS custom properties that automatically adapt to the theme.
            </p>
            <div className="flex gap-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'rgb(var(--accent-purple) / 0.2)',
                  color: 'rgb(var(--accent-purple))',
                }}
              >
                Purple
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'rgb(var(--accent-blue) / 0.2)',
                  color: 'rgb(var(--accent-blue))',
                }}
              >
                Blue
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'rgb(var(--accent-green) / 0.2)',
                  color: 'rgb(var(--accent-green))',
                }}
              >
                Green
              </span>
            </div>
          </div>

          {/* Card 2: Tailwind Classes */}
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-slate-200">
              Tailwind CSS Classes
            </h3>
            <p className="text-sm mb-4 text-slate-300">
              This card uses standard Tailwind classes with your custom theme colors.
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                Purple
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                Blue
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                Green
              </span>
            </div>
          </div>

          {/* Card 3: Button Examples */}
          <div
            style={{
              backgroundColor: 'rgb(var(--bg-secondary))',
              color: 'rgb(var(--text-primary))',
              border: '1px solid rgb(var(--border-color))',
            }}
            className="p-6 rounded-lg space-y-3"
          >
            <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
              Button Examples
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                style={{
                  backgroundColor: 'rgb(var(--accent-purple))',
                }}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Primary
              </button>
              <button
                style={{
                  backgroundColor: 'transparent',
                  color: 'rgb(var(--accent-blue))',
                  border: `1px solid rgb(var(--accent-blue))`,
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/10 transition-colors"
              >
                Secondary
              </button>
              <button
                style={{
                  backgroundColor: 'rgb(var(--accent-green))',
                }}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Success
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors"
              >
                Muted
              </button>
            </div>
          </div>

          {/* Card 4: Interactive Elements */}
          <div
            style={{
              backgroundColor: 'rgb(var(--bg-secondary))',
              color: 'rgb(var(--text-primary))',
              border: '1px solid rgb(var(--border-color))',
            }}
            className="p-6 rounded-lg space-y-4"
          >
            <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
              Form Elements
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter text..."
                className="w-full px-4 py-2 rounded-lg border transition-colors"
                style={{
                  backgroundColor: 'rgb(var(--bg-tertiary))',
                  borderColor: 'rgb(var(--border-color))',
                  color: 'rgb(var(--text-primary))',
                }}
              />
              <select
                className="w-full px-4 py-2 rounded-lg border transition-colors"
                style={{
                  backgroundColor: 'rgb(var(--bg-tertiary))',
                  borderColor: 'rgb(var(--border-color))',
                  color: 'rgb(var(--text-primary))',
                }}
              >
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Theme Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div
                className="h-16 rounded-lg mb-2"
                style={{ backgroundColor: 'rgb(var(--bg-primary))' }}
              />
              <p className="text-xs text-slate-400">bg-primary</p>
            </div>
            <div>
              <div
                className="h-16 rounded-lg mb-2"
                style={{ backgroundColor: 'rgb(var(--bg-secondary))' }}
              />
              <p className="text-xs text-slate-400">bg-secondary</p>
            </div>
            <div>
              <div
                className="h-16 rounded-lg mb-2"
                style={{ backgroundColor: 'rgb(var(--bg-tertiary))' }}
              />
              <p className="text-xs text-slate-400">bg-tertiary</p>
            </div>
            <div>
              <div
                className="h-16 rounded-lg mb-2"
                style={{ backgroundColor: 'rgb(var(--accent-purple))' }}
              />
              <p className="text-xs text-slate-400">accent-purple</p>
            </div>
            <div>
              <div
                className="h-16 rounded-lg mb-2"
                style={{ backgroundColor: 'rgb(var(--accent-blue))' }}
              />
              <p className="text-xs text-slate-400">accent-blue</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">How to Use in Your Components</h2>
          <div className="space-y-3 text-sm text-slate-300">
            <p><strong>1. Import the hook:</strong></p>
            <pre className="bg-slate-900 p-3 rounded text-green-400 overflow-x-auto">
              {`import { useTheme } from '../contexts/ThemeContext';`}
            </pre>
            <p><strong>2. Use in your component:</strong></p>
            <pre className="bg-slate-900 p-3 rounded text-green-400 overflow-x-auto">
{`const MyComponent = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  return <div>...</div>;
};`}
            </pre>
            <p><strong>3. Apply CSS variables:</strong></p>
            <pre className="bg-slate-900 p-3 rounded text-green-400 overflow-x-auto">
{`style={{
  backgroundColor: 'rgb(var(--bg-primary))',
  color: 'rgb(var(--text-primary))',
}}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeTestPage;
