import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

import { Plus, Trash2 } from 'lucide-react'
import type { ParameterRow } from '../../../types'

const ParameterTableComponent = ({ node, updateAttributes, editor, getPos }: any) => {
  const rows: ParameterRow[] = node.attrs.rows ? JSON.parse(node.attrs.rows) : [
    { parameter: '', value: '', type: '' }
  ]
  
  let colWidths = node.attrs.columnWidths || [33, 33, 34];
  if (typeof colWidths === 'string') {
    try {
      colWidths = JSON.parse(colWidths);
    } catch {
      colWidths = colWidths.split(',').map(Number);
    }
  }

  const updateRow = (index: number, field: keyof ParameterRow, value: string) => {
    const newRows = [...rows]
    newRows[index] = { ...newRows[index], [field]: value }
    updateAttributes({ rows: JSON.stringify(newRows) })
  }

  const addRow = () => {
    const newRows = [...rows, { parameter: '', value: '', type: '' }]
    updateAttributes({ rows: JSON.stringify(newRows) })
  }

  const removeRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index)
    updateAttributes({ rows: JSON.stringify(newRows.length ? newRows : [{ parameter: '', value: '', type: '' }]) })
  }

  const handleDeleteTable = () => {
    if (typeof getPos === 'function') {
      editor.commands.deleteRange({ from: getPos(), to: getPos() + node.nodeSize });
    }
  }

  const handleResize = (index: number, startX: number, startWidth: number) => {
    const onMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.pageX - startX;
      const newWidthPercent = Math.max(10, Math.min(80, startWidth + (diff / 8))); // Scale factor for percent
      const newWidths = [...colWidths];
      newWidths[index] = newWidthPercent;
      // We don't update live to avoid heavy re-renders, or we can use local state
      updateAttributes({ columnWidths: newWidths });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper className="my-6 group relative">
      <div className="overflow-hidden border border-slate-200 rounded-lg shadow-sm bg-white">
        <table className="w-full border-collapse text-sm table-fixed">
          <thead>
            <tr className="bg-slate-800 text-white font-medium">
              <th className="px-4 py-2 text-center border-r border-slate-700 relative group/th" style={{ width: `${colWidths[0]}%` }}>
                Parámetro
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 no-print"
                  onMouseDown={(e) => handleResize(0, e.pageX, colWidths[0])}
                />
              </th>
              <th className="px-4 py-2 text-center border-r border-slate-700 relative group/th" style={{ width: `${colWidths[1]}%` }}>
                Valor / Ejemplo
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 no-print"
                  onMouseDown={(e) => handleResize(1, e.pageX, colWidths[1])}
                />
              </th>
              <th className="px-4 py-2 text-center relative group/th" style={{ width: `${colWidths[2]}%` }}>
                Tipo
              </th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2 border-r border-slate-100">
                  <input
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300 p-0 text-sm"
                    placeholder="event_name"
                    value={row.parameter}
                    onChange={(e) => updateRow(index, 'parameter', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2 border-r border-slate-100">
                  <input
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300 p-0 text-sm"
                    placeholder="purchase"
                    value={row.value}
                    onChange={(e) => updateRow(index, 'value', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    className="w-full bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300 p-0 text-sm text-slate-600"
                    placeholder="string"
                    value={row.type}
                    onChange={(e) => updateRow(index, 'type', e.target.value)}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => removeRow(index)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1 flex items-center justify-center mx-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addRow}
          className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:bg-slate-50 border-t border-slate-100 transition-colors"
        >
          <Plus size={14} />
          Añadir parámetro
        </button>
      </div>

      <button
        onClick={handleDeleteTable}
        className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all no-print"
        title="Eliminar tabla"
      >
        <Trash2 size={18} />
      </button>
    </NodeViewWrapper>
  )
}

export const ParameterTableExtension = Node.create({
  name: 'parameterTable',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      rows: {
        default: JSON.stringify([{ parameter: '', value: '', type: '' }]),
      },
      columnWidths: {
        default: [33, 33, 34],
        parseHTML: element => {
          const widths = element.getAttribute('columnwidths') || element.getAttribute('columnWidths');
          if (widths) {
            try {
              return JSON.parse(widths);
            } catch (e) {
              return widths.split(',').map(Number);
            }
          }
          return [33, 33, 34];
        },
        renderHTML: attributes => {
          return {
            columnwidths: JSON.stringify(attributes.columnWidths),
          };
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="parameter-table"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'parameter-table' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ParameterTableComponent)
  },
})
