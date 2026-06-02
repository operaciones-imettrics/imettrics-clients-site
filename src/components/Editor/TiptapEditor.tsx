import { useEditor, EditorContent } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import TextAlign from '@tiptap/extension-text-align'
import { common, createLowlight } from 'lowlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Markdown } from 'tiptap-markdown'
import { useEffect } from 'react'

import { CalloutExtension } from './extensions/CalloutExtension'
import { StatusBadgeExtension } from './extensions/StatusBadgeExtension'
import { ParameterTableExtension } from './extensions/ParameterTableExtension'
import { CollapsibleBlock, CollapsibleSection, CollapsibleSummary, CollapsibleContent } from './extensions/CollapsibleExtension'
import { ResizableImage } from './extensions/ResizableImage'
import { SlashMenu } from './slash-menu'

const lowlight = createLowlight(common)

interface TiptapEditorProps {
  initialContent?: JSONContent;
  initialMarkdown?: string;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
}

export const TiptapEditor = ({
  initialContent,
  initialMarkdown,
  onChange,
  editable = true,
}: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Escribe / para ver comandos o empieza a escribir...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ResizableImage,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CalloutExtension,
      StatusBadgeExtension,
      ParameterTableExtension,
      CollapsibleBlock,
      CollapsibleSection,
      CollapsibleSummary,
      CollapsibleContent,
      SlashMenu,
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: true,
        breaks: true,
      }),
    ],
    content: initialContent || { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none focus:outline-none min-h-[500px] mt-4',
      },
    },
  })

  useEffect(() => {
    if (editor && editable !== undefined) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  useEffect(() => {
    if (initialMarkdown && editor && editor.isEmpty) {
      editor.commands.setContent(initialMarkdown);
    }
  }, [initialMarkdown, editor]);

  if (!editor) {
    return <div className="min-h-[500px] flex items-center justify-center text-slate-400 font-medium">Cargando editor...</div>;
  }

  return (
    <div className="tiptap-editor-container bg-white border border-slate-200 rounded-md p-6 shadow-sm relative">
      <EditorContent editor={editor} />
    </div>
  )
}
