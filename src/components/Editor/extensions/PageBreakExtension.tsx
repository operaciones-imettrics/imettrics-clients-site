import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Scissors, Trash2 } from 'lucide-react';

const PageBreakComponent = ({ node, editor, getPos }: any) => {
  const handleDelete = () => {
    if (typeof getPos === 'function') {
      editor.commands.deleteRange({ from: getPos(), to: getPos() + node.nodeSize });
    }
  };

  return (
    <NodeViewWrapper className="my-6 group relative page-break-wrapper">
      <div className="page-break flex items-center justify-center border-t-2 border-dashed border-slate-300 relative py-2">
        <span className="page-break-label bg-slate-100 text-slate-500 text-xs font-bold uppercase px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5 select-none no-print">
          <Scissors size={14} /> Salto de página (PDF)
        </span>
        <button
          onClick={handleDelete}
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all no-print bg-white rounded-md shadow-sm border border-slate-100"
          title="Eliminar salto de página"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export const PageBreakExtension = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-break', class: 'page-break' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBreakComponent);
  },
});
