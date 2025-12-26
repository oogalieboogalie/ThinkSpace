import React from 'react';
import { Palette, Sun, Moon, Zap, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, toggleTheme } = useTheme();

  const themes = [
    { id: 'dark', name: 'Dark', icon: <Moon className="w-4 h-4" />, color: 'slate' },
    { id: 'light', name: 'Light', icon: <Sun className="w-4 h-4" />, color: 'yellow' },
    { id: 'cosmic', name: 'Cosmic ⚡', icon: <Sparkles className="w-4 h-4" />, color: 'teal' },
    { id: 'cream', name: 'Cream ☕', icon: <Palette className="w-4 h-4" />, color: 'yellow' },
    { id: 'soft', name: 'Soft UI ☁️', icon: <Sparkles className="w-4 h-4" />, color: 'slate' },
    { id: 'hawkeye', name: 'Hawkeye 🦅', icon: <Zap className="w-4 h-4" />, color: 'yellow' },
    { id: 'gielinor', name: 'Gielinor ⚔️', icon: <Palette className="w-4 h-4" />, color: 'blue' },
    { id: 'forest', name: 'Forest 🌲', icon: <Palette className="w-4 h-4" />, color: 'green' },
    { id: 'nebula', name: 'Nebula 🌌', icon: <Sparkles className="w-4 h-4" />, color: 'purple' },
    { id: 'matrix', name: 'Matrix 💊', icon: <Zap className="w-4 h-4" />, color: 'green' },
  ] as const;

  return (
    <div className="flex items-center gap-2">
      {/* Theme Selector Dropdown */}
      <div className="relative group">
        <button className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted rounded-lg transition-colors">
          <Palette className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">
            {themes.find(t => t.id === theme)?.name}
          </span>
        </button>

        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="p-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${theme === t.id
                  ? 'bg-purple-500 text-white'
                  : 'text-foreground hover:bg-muted'
                  }`}
              >
                <div className={`w-6 h-6 rounded-full bg-${t.color}-500 flex items-center justify-center`}>
                  {t.icon}
                </div>
                <span className="text-sm">{t.name}</span>
                {theme === t.id && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Toggle Button */}
      <button
        onClick={toggleTheme}
        className="p-2 bg-card hover:bg-muted rounded-lg transition-colors group"
        title="Quick theme toggle (cycles through all themes)"
      >
        <Palette className="w-5 h-5 text-primary group-hover:text-primary" />
      </button>
    </div>
  );
};

export default ThemeSwitcher;
