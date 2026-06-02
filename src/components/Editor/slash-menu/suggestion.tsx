import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { MenuList } from './MenuList'
import { Heading1, Heading2, Heading3, Type, Info, BadgeCheck, Code2, TableProperties, ChevronDown, AlignCenter, AlignRight, Plus } from 'lucide-react';

// Helper to open file selector and insert image
const insertImageFromFile = (editor: any) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

export const suggestion = {
  items: ({ query }: { query: string }) => {
    return [
      {
        title: 'Texto',
        description: 'Empieza a escribir texto plano.',
        icon: <Type size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setParagraph().run()
        },
      },
      {
        title: 'Encabezado 1',
        description: 'Encabezado de sección grande.',
        icon: <Heading1 size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        },
      },
      {
        title: 'Encabezado 2',
        description: 'Encabezado de sección mediano.',
        icon: <Heading2 size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        },
      },
      {
        title: 'Encabezado 3',
        description: 'Encabezado de sección pequeño.',
        icon: <Heading3 size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
        },
      },
      {
        title: 'Encabezado 4',
        description: 'Encabezado de sección muy pequeño.',
        icon: <Type size={18} />, 
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run()
        },
      },
      {
        title: 'Imagen',
        description: 'Inserta una imagen desde tu dispositivo.',
        icon: <TableProperties size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).run()
          insertImageFromFile(editor)
        },
      },
      {
        title: 'Tabla de parámetros',
        description: 'Inserta una tabla de parámetros de GA4.',
        icon: <TableProperties size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertContent({ type: 'parameterTable' }).run()
        },
      },
      {
        title: 'Callout',
        description: 'Inserta un bloque de aviso o información.',
        icon: <Info size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertContent({ type: 'callout', content: [{ type: 'paragraph' }] }).run()
        },
      },
      {
        title: 'Badge de Estado',
        description: 'Inserta un indicador de estado (Nuevo, Pausado, etc).',
        icon: <BadgeCheck size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertContent({ type: 'statusBadge' }).run()
        },
      },
      {
        title: 'Bloque de código',
        description: 'Inserta un fragmento de código o JSON.',
        icon: <Code2 size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        },
      },
      {
        title: 'Bloque contraíble',
        description: 'Crea un cuadro que se puede expandir/contraer.',
        icon: <ChevronDown size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertContent({
            type: 'collapsibleBlock',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contenido contraíble aquí...' }] }]
          }).run()
        },
      },
      {
        title: 'Centrar texto',
        description: 'Centra el párrafo o encabezado actual.',
        icon: <AlignCenter size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setTextAlign('center').run()
        },
      },
      {
        title: 'Alinear derecha',
        description: 'Alinea el texto a la derecha.',
        icon: <AlignRight size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setTextAlign('right').run()
        },
      },
      {
        title: 'Nuevo evento',
        description: 'Inserta la plantilla completa para documentar un nuevo evento GA4.',
        icon: <Plus size={18} />,
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertContent([
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Título de evento H2" }]
            },
            {
              type: "heading",
              attrs: { level: 4 },
              content: [{ type: "text", text: "¿Qué se mide?" }]
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "El objetivo es medir..." }]
            },
            {
              type: "heading",
              attrs: { level: 4 },
              content: [{ type: "text", text: "¿Cuándo se ejecuta el Evento?" }]
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Debe dispararse cuando..." }]
            },
            {
              type: "heading",
              attrs: { level: 4 },
              content: [{ type: "text", text: "Evento, parámetros y dataLayer" }]
            },
            {
              type: "callout",
              attrs: { type: "success" },
              content: [{
                type: "paragraph",
                content: [{ type: "text", text: "Nombre del evento GA4: event_name" }]
              }]
            },
            {
              type: "parameterTable",
              attrs: {
                rows: JSON.stringify([
                  { param: "param1", value: "Hola", type: "Evento" },
                  { param: "param2", value: "{A|B}", type: "Evento" }
                ]),
                columnWidths: [33, 33, 34]
              }
            },
            {
              type: "codeBlock",
              attrs: { language: "javascript" },
              content: [{
                type: "text",
                text: "dataLayer.push({\n    'event': 'event_name',    \n    'param1': 'Hola',     \n    'param2': '{A|B}'\n});"
              }]
            },
            {
              type: "heading",
              attrs: { level: 4 },
              content: [{ type: "text", text: "Aclaraciones" }]
            },
            {
              type: "callout",
              attrs: { type: "info" },
              content: [{
                type: "paragraph",
                content: [{ type: "text", text: "Los campos entre { } son dinámicos y deben ser completados'param1' Debe indicar..." }]
              }]
            }
          ]).run()
        },
      },
    ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
  },

  render: () => {
    let component: any
    let popup: any

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MenuList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props: any) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
