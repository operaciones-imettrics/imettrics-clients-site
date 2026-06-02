import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Trash2, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * NEW SIMPLIFIED COLLAPSIBLE BLOCK
 */
export const CollapsibleBlock = Node.create({
  name: 'collapsibleBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: element => element.getAttribute('data-open') === 'true',
        renderHTML: attributes => ({ 'data-open': attributes.open }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="collapsible-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'collapsible-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes, getPos, editor }) => {
      const isOpen = node.attrs.open;

      return (
        <NodeViewWrapper className="collapsible-block-wrapper group relative my-6">
          <div className={`border-2 rounded-xl transition-all duration-300 overflow-hidden ${
            isOpen ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-100 bg-slate-50'
          }`}>
            <div 
              className="flex items-center justify-between px-3 py-2 bg-slate-100/50 hover:bg-slate-200/50 transition-colors cursor-pointer no-print"
              onClick={() => updateAttributes({ open: !isOpen })}
            >
              <div className="flex items-center gap-2 text-slate-500 font-medium text-xs uppercase tracking-wider select-none">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>{isOpen ? 'Contraer contenido' : 'Expandir contenido'}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof getPos === 'function') {
                    const pos = getPos();
                    if (typeof pos === 'number') {
                      editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
                    }
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all rounded-md hover:bg-white/50"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className={`transition-all duration-300 ${isOpen ? 'p-4 block' : 'h-0 overflow-hidden hidden'}`}>
              <NodeViewContent className="collapsible-content-area" />
            </div>
          </div>
        </NodeViewWrapper>
      );
    });
  },
});

/**
 * BACKWARD COMPATIBILITY NODES
 * These are needed to prevent existing documents from crashing.
 */
export const CollapsibleSection = Node.create({
  name: 'collapsibleSection',
  group: 'block',
  content: 'collapsibleSummary collapsibleContent',
  parseHTML() { return [{ tag: 'details' }]; },
  renderHTML({ HTMLAttributes }) { return ['details', mergeAttributes(HTMLAttributes), 0]; },
});

export const CollapsibleSummary = Node.create({
  name: 'collapsibleSummary',
  group: 'block',
  content: 'text*',
  parseHTML() { return [{ tag: 'summary' }]; },
  renderHTML({ HTMLAttributes }) { return ['summary', mergeAttributes(HTMLAttributes), 0]; },
});

export const CollapsibleContent = Node.create({
  name: 'collapsibleContent',
  group: 'block',
  content: 'block+',
  parseHTML() { return [{ tag: 'div.collapsible-content' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { class: 'collapsible-content' }), 0]; },
});
