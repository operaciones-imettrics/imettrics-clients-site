import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Maximize2, Type } from 'lucide-react';

const ResizableImageComponent = ({ node, updateAttributes, getPos, editor }: any) => {
  const { src, width, alt, caption } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width || '100%');
  const [showCaptionInput, setShowCaptionInput] = useState(!!caption);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentWidth(width || '100%');
  }, [width]);

  const onMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setIsResizing(true);
    const startX = event.pageX;
    const containerWidth = imageRef.current?.parentElement?.parentElement?.offsetWidth || 800;
    const startWidthPx = imageRef.current?.offsetWidth || 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.pageX - startX;
      const newWidthPx = Math.max(100, startWidthPx + diff);
      const newWidthPercent = Math.min(100, Math.round((newWidthPx / containerWidth) * 100));
      setCurrentWidth(`${newWidthPercent}%`);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      updateAttributes({ width: currentWidth });
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const setPresetWidth = (pct: string) => {
    updateAttributes({ width: pct });
  };

  const handleDelete = () => {
    if (typeof getPos === 'function') {
      editor.commands.deleteRange({ from: getPos(), to: getPos() + node.nodeSize });
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ caption: e.target.value });
  };

  return (
    <NodeViewWrapper className="resizable-image-node flex flex-col items-center my-8 group relative w-full">
      <div 
        className={`relative inline-block border-2 transition-all rounded-xl overflow-hidden ${
          isResizing ? 'border-blue-500 ring-4 ring-blue-100 shadow-xl' : 'border-slate-100 hover:border-blue-300 shadow-sm'
        }`}
        style={{ width: isResizing ? currentWidth : (width || '100%'), maxWidth: '100%' }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            pointerEvents: isResizing ? 'none' : 'auto',
          }}
          className="select-none"
        />
        
        {/* Resize Handle */}
        <div
          onMouseDown={onMouseDown}
          className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 cursor-nwse-resize flex items-center justify-center no-print shadow-lg hover:bg-blue-700 transition-colors z-20"
          style={{ borderRadius: '8px 0 0 0' }}
        >
          <Maximize2 size={16} className="text-white" />
        </div>

        {/* Quick Toolbar */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 transition-all z-20 no-print">
          {['25%', '50%', '75%', '100%'].map(pct => (
            <button
              key={pct}
              onClick={() => setPresetWidth(pct)}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                width === pct ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {pct}
            </button>
          ))}
          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
          <button
            onClick={() => setShowCaptionInput(!showCaptionInput)}
            className={`p-1.5 rounded transition-colors ${showCaptionInput ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Añadir leyenda"
          >
            <Type size={14} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            title="Eliminar imagen"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Caption Input / Display */}
      {(showCaptionInput || caption) && (
        <div className="mt-3 w-full max-w-2xl px-4">
          <input
            type="text"
            value={caption || ''}
            onChange={handleCaptionChange}
            placeholder="Escribe una leyenda para la imagen..."
            className="w-full text-center text-sm italic text-slate-500 border-none outline-none bg-transparent placeholder:text-slate-300"
          />
          <div className="h-[1px] w-1/4 mx-auto bg-slate-100 mt-1 no-print" />
        </div>
      )}

      {/* Size Badge */}
      {isResizing && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-1 rounded shadow-md font-bold z-30">
          {currentWidth}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      caption: { default: '' },
      width: { 
        default: '100%',
        parseHTML: element => element.style.width || element.getAttribute('width'),
        renderHTML: attributes => {
          return {
            width: attributes.width,
            style: `width: ${attributes.width}; height: auto; display: block; margin: 0 auto;`
          }
        }
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { caption, width } = node.attrs;
    return [
      'figure', 
      { style: 'display: flex; flex-direction: column; align-items: center; margin: 2rem 0;' },
      ['img', mergeAttributes(HTMLAttributes, { style: `width: ${width}; height: auto;` })],
      caption ? ['figcaption', { style: 'text-align: center; font-style: italic; color: #64748b; font-size: 0.875rem; margin-top: 0.75rem;' }, caption] : '',
    ];
  },

  addCommands() {
    return {
      setImage: (options: any) => ({ commands }: any) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    } as any
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
