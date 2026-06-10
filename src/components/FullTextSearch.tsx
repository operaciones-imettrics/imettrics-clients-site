import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, X, ArrowRight } from 'lucide-react';
import { storage } from '../services/storage';
import type { Guide } from '../types';

interface SearchResult {
  guide: Guide;
  snippets: string[];
}

interface FullTextSearchProps {
  onSelectGuide: (id: string) => void;
}

/** Recursively extracts all text content from a TipTap JSON node */
function extractText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) {
    return node.content.map(extractText).join(' ');
  }
  return '';
}

/** Returns ~80-char snippet around the first match of the query */
function buildSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 40);
  const snippet = text.slice(start, end);
  return (start > 0 ? '…' : '') + snippet.trim() + (end < text.length ? '…' : '');
}

/** Highlights the matching query within a snippet */
function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export const FullTextSearch: React.FC<FullTextSearchProps> = ({ onSelectGuide }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open with Ctrl/Cmd+F or Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'k')) {
        // Only intercept if not inside an editor
        const active = document.activeElement;
        const inEditor = active?.closest('.ProseMirror');
        if (!inEditor) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Search logic
  const performSearch = useCallback((q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      return;
    }
    const guides = storage.getGuides();
    const matched: SearchResult[] = [];

    for (const guide of guides) {
      const fullText = extractText(guide.content);
      const titleMatch = guide.title.toLowerCase().includes(q.toLowerCase());
      const contentMatch = fullText.toLowerCase().includes(q.toLowerCase());

      if (titleMatch || contentMatch) {
        const snippets: string[] = [];
        if (contentMatch) {
          // Find up to 3 occurrences
          let text = fullText;
          let searchFrom = 0;
          let count = 0;
          while (count < 3) {
            const idx = text.toLowerCase().indexOf(q.toLowerCase(), searchFrom);
            if (idx === -1) break;
            snippets.push(buildSnippet(text, q));
            searchFrom = idx + q.length + 80; // skip to next context window
            count++;
          }
        }
        matched.push({ guide, snippets });
      }
    }

    setResults(matched.slice(0, 20)); // cap at 20
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (id: string) => {
    onSelectGuide(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        title="Buscar en guías (Ctrl+F)"
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all w-full"
      >
        <Search size={13} />
        <span className="flex-1 text-left">Buscar en guías...</span>
        <kbd className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono">⌘F</kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

          {/* Search Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[70vh]">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en todas las guías..."
                className="flex-1 text-base text-slate-800 outline-none placeholder-slate-400"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-slate-400 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors font-mono"
              >
                Esc
              </button>
            </div>

            {/* Results */}
            <div className="overflow-y-auto flex-1">
              {query.length >= 2 && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Search size={32} className="mb-3 opacity-30" />
                  <p className="text-sm">No se encontraron resultados para "<strong>{query}</strong>"</p>
                </div>
              )}

              {query.length > 0 && query.length < 2 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Escribe al menos 2 caracteres para buscar...
                </div>
              )}

              {!query && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Escribe para buscar en el contenido de todas las guías
                </div>
              )}

              {results.length > 0 && (
                <div className="p-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
                    {results.length} guía{results.length !== 1 ? 's' : ''} encontrada{results.length !== 1 ? 's' : ''}
                  </p>
                  {results.map(({ guide, snippets }) => (
                    <button
                      key={guide.id}
                      onClick={() => handleSelect(guide.id)}
                      className="w-full text-left px-3 py-3 rounded-xl hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all group flex gap-3 items-start mb-1"
                    >
                      <div className="shrink-0 mt-0.5 w-8 h-8 bg-slate-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                        <FileText size={15} className="text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate mb-1">
                          <HighlightedSnippet text={guide.title || 'Sin título'} query={query} />
                        </p>
                        {snippets.length > 0 && (
                          <div className="space-y-1">
                            {snippets.slice(0, 2).map((snippet, i) => (
                              <p key={i} className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                <HighlightedSnippet text={snippet} query={query} />
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight size={14} className="shrink-0 text-slate-300 group-hover:text-blue-400 mt-1 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
