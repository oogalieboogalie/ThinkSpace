import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Search, FileText, Loader2 } from 'lucide-react';

interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  matches: number;
}

const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const searchResults = await invoke<SearchResult[]>('search_content', {
        query: query.trim(),
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search();
    }
  };

  const openFile = async (path: string) => {
    // This would switch to content browser and open the file
    console.log('Opening file:', path);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/20 p-2 rounded-lg">
            <Search className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Quick Search</h2>
            <p className="text-xs text-muted-foreground">Search across 259+ guides instantly</p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-6 bg-background border-b border-border">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for anything... (ADHD tips, Tauri guide, pricing strategies...)"
            className="flex-1 px-4 py-3 bg-card border border-border rounded-lg
              focus:outline-none focus:border-yellow-500 text-foreground"
          />
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="px-6 bg-yellow-500 hover:bg-yellow-600 disabled:bg-muted
              disabled:text-muted-foreground text-foreground rounded-lg transition-colors
              flex items-center gap-2 font-medium"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {!searched ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-muted-foreground mb-2">
                Search your knowledge base
              </h3>
              <p className="text-muted-foreground">Enter a query to find relevant guides</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found for "{query}"</p>
            <p className="text-muted-foreground text-sm mt-2">Try different keywords</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result, i) => (
              <button
                key={i}
                onClick={() => openFile(result.path)}
                className="w-full bg-background border border-border hover:border-yellow-500
                  rounded-lg p-4 text-left transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-yellow-400 mb-1">
                      {result.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {result.snippet}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{result.path}</span>
                      <span>•</span>
                      <span>{result.matches} match{result.matches !== 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
