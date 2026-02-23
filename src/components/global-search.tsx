'use client';

import { useState, useEffect } from 'react';
import { X, Search, Clock, Tag as TagIcon, MoreHorizontal } from 'lucide-react';
import { Event, EventType } from '@prisma/client';

interface GlobalSearchProps {
  onNavigate: (type: string, id: string) => void;
}

interface SearchResult {
  type: 'task' | 'event' | 'memory';
  id: string;
  title: string;
  description?: string;
  metadata?: any;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeType, setActiveType] = useState<'all' | 'task' | 'event' | 'memory'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        setIsOpen(true);
        // Focus on search input
        setTimeout(() => document.getElementById('global-search-input')?.focus(), 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && query.length >= 2) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [isOpen, query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      // Search memories with full-text search
      const memoriesResponse = await fetch('/api/memories/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const memories = await memoriesResponse.json();

      // Convert to search results
      const memoryResults = memories.map((m: any) => ({
        type: 'memory' as const,
        id: m.id,
        title: m.title,
        description: m.summary,
        metadata: m,
      }));

      // Search tasks (basic string matching for now)
      const tasksResponse = await fetch('/api/tasks/search?query=' + encodeURIComponent(searchQuery));
      const tasks = await tasksResponse.json();
      const taskResults = tasks.map((t: any) => ({
        type: 'task' as const,
        id: t.id,
        title: t.title,
        description: t.description,
        metadata: t,
      }));

      // Search events (basic string matching for now)
      const eventsResponse = await fetch('/api/events?search=' + encodeURIComponent(searchQuery));
      const events = await eventsResponse.json();
      const eventResults = events.map((e: any) => ({
        type: 'event' as const,
        id: e.id,
        title: e.title,
        description: e.description,
        metadata: e,
      }));

      // Combine results
      const allResults = [
        ...taskResults,
        ...eventResults,
        ...memoryResults,
      ];

      setResults(allResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'bg-blue-100 text-blue-700';
      case 'event':
        return 'bg-purple-100 text-purple-700';
      case 'memory':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return '📋';
      case 'event':
        return '📅';
      case 'memory':
        return '🧠';
      default:
        return '📄';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3 flex-1">
            <Search className="h-5 w-5 text-gray-500" />
            <input
              id="global-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, events, and memories..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {isLoading && (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Type Filters */}
            <select
              value={activeType}
              onChange={(e) => setActiveType(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="task">Tasks</option>
              <option value="event">Events</option>
              <option value="memory">Memories</option>
            </select>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {query.length < 2 ? (
            <div className="text-center py-16">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Type at least 2 characters to search</p>
              <p className="text-sm text-gray-500">
                Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+K</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">/</kbd> to open
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Full-text search available for memories, basic matching for tasks and events
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No results found for "{query}"</p>
              <p className="text-sm text-gray-500">Try different keywords or search in specific categories</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>

              {results.map((result) => {
                const typeColor = getTypeColor(result.type);
                const typeIcon = getTypeIcon(result.type);

                return (
                  <div
                    key={result.id}
                    onClick={() => {
                      onNavigate(result.type, result.id);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeColor}`}>
                      <span className="text-lg">{typeIcon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {result.title}
                        </h4>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">
                          {result.type}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                      {result.metadata && result.metadata.source && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {result.metadata.source === 'TASK_DONE' && (
                            <>
                              <span className="text-xs text-gray-400">From task:</span>
                              <span className="text-sm font-medium text-green-700">
                                {result.metadata.sourceTask?.title || 'Unknown'}
                              </span>
                            </>
                          )}
                          {result.metadata.source === 'RUN_FINISHED' && (
                            <>
                              <span className="text-xs text-gray-400">From run:</span>
                              <span className="text-sm font-medium text-blue-700">
                                {result.metadata.sourceRun?.eventId || 'Unknown'}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      {result.metadata && result.metadata.tags && result.metadata.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <TagIcon className="h-3 w-3 text-gray-400" />
                          {result.metadata.tags.slice(0, 3).map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {result.metadata.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{result.metadata.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex gap-2 text-xs text-gray-400">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-white rounded text-[10px]">Esc</kbd>
            <span>to close</span>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setQuery('');
              setResults([]);
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
