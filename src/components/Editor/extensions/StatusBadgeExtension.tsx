import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Trash2 } from 'lucide-react';

// Component responsible for rendering the badge and handling click to cycle states
const StatusBadgeComponent = ({ node, updateAttributes, editor, getPos }: any) => {
  const status = (node.attrs.status as string) || 'new';
  const states = ['new', 'deprecated', 'update'] as const;

  const nextState = () => {
    const idx = states.indexOf(status as any);
    const next = states[(idx + 1) % states.length];
    updateAttributes({ status: next });
  };

  const handleDelete = () => {
    if (typeof getPos === 'function') {
      editor.commands.deleteRange({ from: getPos(), to: getPos() + node.nodeSize });
    }
  }

  const colors = {
    new: 'bg-green-100 text-green-800 border-green-200',
    deprecated: 'bg-rose-100 text-rose-800 border-rose-200',
    update: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  const labels = {
    new: 'Nuevo',
    deprecated: 'Deprecado',
    update: 'Actualización',
  };

  return (
    <NodeViewWrapper className="my-2 group relative inline-block">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${colors[status as keyof typeof colors]}`}
        onClick={nextState}
        style={{ cursor: 'pointer' }}
        title="Click para cambiar estado"
      >
        {labels[status as keyof typeof labels]}
      </span>
      <button
        onClick={handleDelete}
        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all no-print"
      >
        <Trash2 size={14} />
      </button>
    </NodeViewWrapper>
  );
};

export const StatusBadgeExtension = Node.create({
  name: 'statusBadge',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      status: { default: 'new' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="status-badge"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'status-badge' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StatusBadgeComponent);
  },
});
