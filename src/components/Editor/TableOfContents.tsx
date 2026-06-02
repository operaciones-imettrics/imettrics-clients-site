import React from 'react';
import { List, ChevronRight } from 'lucide-react';
import type { JSONContent } from '@tiptap/core';

interface Heading {
  text: string;
  level: number;
  id: string;
}

interface TableOfContentsProps {
  content: JSONContent;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
  const getHeadings = (nodes: any[]): Heading[] => {
    const headings: Heading[] = [];
    
    const extract = (nodeList: any[]) => {
      nodeList.forEach(node => {
        if (node.type === 'heading' && node.attrs?.level >= 1 && node.attrs?.level <= 2) {
          const text = node.content?.map((c: any) => c.text).join('') || 'Sin título';
          headings.push({
            text,
            level: node.attrs.level,
            id: text.toLowerCase().replace(/\s+/g, '-')
          });
        }
        
        // Also check inside all types of collapsible sections (old and new)
        if ((node.type === 'collapsibleSection' || node.type === 'collapsibleBlock' || node.type === 'collapsibleContent') && node.content) {
          extract(node.content);
        }
      });
    };

    if (nodes) extract(nodes);
    return headings;
  };

  const headings = getHeadings(content.content || []);

  if (headings.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p className="text-xs italic">Agrega encabezados H1 o H2 para ver el índice</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wider">
        <List size={16} />
        Índice
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-1">
        {headings.map((heading, index) => (
          <button
            key={index}
            onClick={() => {
              // Find the heading element in the editor DOM
              const editorEl = document.querySelector('.tiptap');
              if (!editorEl) return;
              
              const headingEls = Array.from(editorEl.querySelectorAll('h1, h2, h3, h4'));
              const target = headingEls.find(el => el.textContent === heading.text);
              
              if (target) {
                // Auto-expand parent if it's inside a collapsed section
                const details = target.closest('details') || target.closest('[data-type="collapsible-block"]');
                if (details) {
                   // Logic to ensure it's visible
                   // For now, details.open works for standard tags. 
                   // For our custom block, we might need a more complex way but usually they render as open if not specified.
                   if (details.tagName === 'DETAILS') (details as any).open = true;
                }
                
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Briefly highlight the target
                const originalBg = (target as HTMLElement).style.backgroundColor;
                (target as HTMLElement).style.backgroundColor = '#eff6ff';
                setTimeout(() => {
                  (target as HTMLElement).style.backgroundColor = originalBg;
                }, 1000);
              }
            }}
            className={`w-full text-left p-2 rounded-lg transition-all hover:bg-slate-50 group flex items-start gap-2 ${
              heading.level === 1 ? 'pl-2 text-slate-900 font-bold text-sm' : 
              heading.level === 2 ? 'pl-6 text-slate-700 font-semibold text-xs' :
              heading.level === 3 ? 'pl-9 text-slate-500 text-[11px]' :
              'pl-12 text-slate-400 text-[10px]'
            }`}
          >
            <ChevronRight 
              size={12} 
              className={`mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${heading.level === 1 ? 'text-blue-500' : 'text-slate-400'}`} 
            />
            <span className="truncate">{heading.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
