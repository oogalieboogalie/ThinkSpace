import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemedExample: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 bg-background rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Theme-Aware Component Example</h2>
        <button
          onClick={toggleTheme}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
        >
          Toggle Theme ({theme})
        </button>
      </div>

      {/* Method 1: Using CSS variables (BEST for dynamic theming) */}
      <div
        style={{
          backgroundColor: 'rgb(var(--bg-primary) / <alpha-value>)',
          color: 'rgb(var(--text-primary) / <alpha-value>)',
          border: '1px solid rgb(var(--border-color) / <alpha-value>)',
        }}
        className="p-6 rounded-lg"
      >
        <h3 className="text-lg font-semibold mb-2">Using CSS Custom Properties</h3>
        <p className="text-sm opacity-80">
          This card uses CSS variables that change based on the theme. The colors automatically
          update when you switch themes!
        </p>
      </div>

      {/* Method 2: Using Tailwind classes (works with theme classes) */}
      <div className="bg-card border border-border p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Using Tailwind Classes</h3>
        <p className="text-sm text-foreground">
          This card uses Tailwind classes. You can also create theme-specific classes.
        </p>
      </div>

      {/* Method 3: Theme-specific styling */}
      <div className={`p-6 rounded-lg ${
        theme === 'dark' ? 'bg-card text-foreground' :
        theme === 'light' ? 'bg-muted text-foreground' :
        theme === 'cosmic' ? 'bg-indigo-900/60 text-indigo-100' :
        theme === 'cream' ? 'bg-amber-50 text-amber-900' :
        theme === 'soft' ? 'bg-white text-gray-700 shadow' :
        'bg-green-900/50 text-green-100'
      }`}>
        <h3 className="text-lg font-semibold mb-2">Using Theme Classes</h3>
        <p className="text-sm opacity-80">
          This card uses conditional classes based on the current theme.
        </p>
      </div>

      {/* Demo of color usage */}
      <div className="grid grid-cols-3 gap-4">
        <div
          style={{
            backgroundColor: 'rgb(var(--accent-purple) / <alpha-value>)',
          }}
          className="p-4 rounded-lg text-white text-center"
        >
          Purple Accent
        </div>
        <div
          style={{
            backgroundColor: 'rgb(var(--accent-blue) / <alpha-value>)',
          }}
          className="p-4 rounded-lg text-white text-center"
        >
          Blue Accent
        </div>
        <div
          style={{
            backgroundColor: 'rgb(var(--accent-green) / <alpha-value>)',
          }}
          className="p-4 rounded-lg text-white text-center"
        >
          Green Accent
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-2">
        <p><strong>How to use themes in your components:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Import useTheme from '../contexts/ThemeContext'</li>
          <li>Use CSS custom properties: rgb(var(--color-name) / alpha)</li>
          <li>Or use Tailwind classes: bg-card, text-foreground</li>
          <li>Or use conditional logic: theme === 'dark' ? 'class1' : 'class2'</li>
        </ul>
      </div>
    </div>
  );
};

export default ThemedExample;
