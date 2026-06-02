import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Info, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react'

const CalloutComponent = ({ node, updateAttributes, editor, getPos }: any) => {
  const type = node.attrs.type || 'info'
  
  const types = ['info', 'warning', 'success'] as const
  
  const toggleType = () => {
    const currentIndex = types.indexOf(type)
    const nextIndex = (currentIndex + 1) % types.length
    updateAttributes({ type: types[nextIndex] })
  }

  const handleDelete = () => {
    if (typeof getPos === 'function') {
      editor.commands.deleteRange({ from: getPos(), to: getPos() + node.nodeSize });
    }
  }

  const icons = {
    info: <Info size={20} className="text-blue-600" />,
    warning: <AlertTriangle size={20} className="text-orange-600" />,
    success: <CheckCircle size={20} className="text-green-600" />,
  }

  const bgColors = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-orange-50 border-orange-200',
    success: 'bg-green-50 border-green-200',
  }

  return (
    <NodeViewWrapper className={`group relative callout flex gap-3 p-4 my-4 rounded-lg border transition-colors duration-200 ${bgColors[type as keyof typeof bgColors]}`}>
      <div 
        className="flex-shrink-0 mt-0.5 cursor-pointer hover:scale-110 transition-transform" 
        onClick={toggleType}
        contentEditable={false}
        title="Haz clic para cambiar el tipo"
      >
        {icons[type as keyof typeof icons]}
      </div>
      <NodeViewContent className="flex-grow min-w-0" />
      
      <button
        onClick={handleDelete}
        className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all no-print"
        title="Eliminar bloque"
      >
        <Trash2 size={18} />
      </button>
    </NodeViewWrapper>
  )
}

export const CalloutExtension = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  draggable: true,
  
  addAttributes() {
    return {
      type: {
        default: 'info',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent)
  },
})
