import React, { useState, useEffect, useCallback } from "react";
import { FileDown, Download, Save, ArrowLeft, PanelRightClose, PanelRightOpen, ChevronDown } from "lucide-react";
import { Menu } from "@mantine/core";
import { TiptapEditor } from "../components/Editor/TiptapEditor";
import { TableOfContents } from "../components/Editor/TableOfContents";
import type { Guide, ParameterRow } from "../types";
import { storage } from "../services/storage";
import { exportGuideAsBackup } from "../services/markdownExporter";
import debounce from "lodash.debounce";

import { useAuth } from "../components/AuthProvider";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() { 
    if (this.state.hasError) return <div className="p-4 bg-red-50 text-red-900"><h3 className="font-bold">Editor Crash</h3><pre className="text-xs whitespace-pre-wrap">{this.state.error?.stack || this.state.error?.message}</pre></div>; 
    return this.props.children; 
  }
}

interface EditorPageProps {
  guideId: string;
  initialMarkdown?: string;
  onBack: () => void;
}

export const EditorPage: React.FC<EditorPageProps> = ({ guideId, initialMarkdown, onBack }) => {
  const { user } = useAuth();
  const isAdmin = user?.customRole === 'admin';
  const [guide, setGuide] = useState<Guide | null>(null);
  const [isTocOpen, setIsTocOpen] = useState(() => {
    const stored = localStorage.getItem('isTocOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [tocWidth, setTocWidth] = useState(256);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const g = storage.getGuide(guideId);
    if (g) {
      setGuide(g);
      if (!g.title && isAdmin) {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    }
  }, [guideId, isAdmin]);

  // Save TOC open state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isTocOpen', JSON.stringify(isTocOpen));
  }, [isTocOpen]);

  const debouncedSave = useCallback(
    debounce((updatedGuide: Guide) => {
      storage.saveGuide(updatedGuide);
    }, 1000),
    []
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!guide) return;
    const updated = { ...guide, title: e.target.value };
    setGuide(updated);
    debouncedSave(updated);
  };

  const handleContentChange = (blocks: any) => {
    if (!guide) return;
    const updated = { ...guide, content: blocks };
    setGuide(updated);
    debouncedSave(updated);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleSaveBackup = () => {
    if (!guide) return;
    const result = exportGuideAsBackup(guide.id);
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(result.url);
  };

  const handleExportJSON = () => {
    if (!guide) return;

    const nodes = guide.content?.content || [];
    
    const getPlainNodeText = (node: any): string => {
      if (!node) return "";
      if (node.type === "text" && node.text) return node.text;
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(getPlainNodeText).join("");
      }
      return "";
    };

    const parseContentBlocks = (blocks: any[]): any[] => {
      const parsed: any[] = [];
      
      const traverse = (node: any) => {
        if (!node) return;

        if (node.type === "callout") {
          parsed.push({
            type: "callout",
            style: node.attrs?.type || "info",
            text: getPlainNodeText(node).trim()
          });
          return;
        }

        if (node.type === "parameterTable") {
          const rows: ParameterRow[] = node.attrs?.rows ? JSON.parse(node.attrs.rows as string) : [];
          parsed.push({
            type: "parameterTable",
            parameters: rows.map(r => ({
              param: r.parameter,
              value: r.value,
              type: r.type
            }))
          });
          return;
        }

        if (node.type === "collapsibleBlock") {
          parsed.push({
            type: "collapsible",
            title: node.attrs?.title || "Ver detalles",
            content: getPlainNodeText(node).trim()
          });
          return;
        }

        if (node.type === "heading") {
          parsed.push({
            type: "heading",
            level: node.attrs?.level || 1,
            text: getPlainNodeText(node).trim()
          });
          return;
        }

        if (node.type === "paragraph") {
          const text = getPlainNodeText(node).trim();
          if (text) {
            parsed.push({
              type: "paragraph",
              text: text
            });
          }
          return;
        }

        if (node.type === "codeBlock") {
          parsed.push({
            type: "codeBlock",
            language: node.attrs?.language || "",
            code: getPlainNodeText(node)
          });
          return;
        }

        if (node.type === "bulletList" || node.type === "orderedList") {
          const items: string[] = [];
          if (node.content && Array.isArray(node.content)) {
            node.content.forEach((li: any) => {
              if (li.type === "listItem") {
                items.push(getPlainNodeText(li).trim());
              }
            });
          }
          parsed.push({
            type: node.type === "bulletList" ? "unorderedList" : "orderedList",
            items: items
          });
          return;
        }

        if (node.content && Array.isArray(node.content)) {
          node.content.forEach(traverse);
        }
      };

      blocks.forEach(traverse);
      return parsed;
    };

    const parsedStructure = parseContentBlocks(nodes);

    const exportedEvents: any[] = [];
    let currentEvent: any = null;

    parsedStructure.forEach((block: any) => {
      if (block.type === "heading") {
        currentEvent = {
          name: block.text,
          level: block.level,
          dataLayer: "",
          parameters: [],
          elements: []
        };
        exportedEvents.push(currentEvent);
      } else {
        if (!currentEvent) {
          currentEvent = {
            name: "General",
            level: 0,
            dataLayer: "",
            parameters: [],
            elements: []
          };
          exportedEvents.push(currentEvent);
        }
        
        currentEvent.elements.push(block);
        if (block.type === "codeBlock") {
          currentEvent.dataLayer = block.code;
        } else if (block.type === "parameterTable") {
          currentEvent.parameters = block.parameters;
        }
      }
    });

    const exportData = {
      guide: guide.title,
      exportedAt: new Date().toISOString(),
      events: exportedEvents.map(e => ({
        name: e.name,
        level: e.level,
        dataLayer: e.dataLayer || "",
        parameters: e.parameters || [],
        elements: e.elements || []
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${guide.title.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEdit = () => {
    if (isAdmin) setIsEditing(!isEditing);
  };

  if (!guide) return null;

  return (
    <div className="h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Top Bar - Sticky */}
      <header className="no-print flex-shrink-0 z-20 flex justify-between items-center px-6 py-3 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-[1px] bg-slate-200" />
          <span className="text-sm font-medium text-slate-400 truncate max-w-[200px]">
            {guide.title || "Sin título"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsTocOpen(!isTocOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isTocOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            title={isTocOpen ? "Ocultar índice" : "Mostrar índice"}
          >
            {isTocOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            <span>Índice</span>
          </button>
          <div className="h-6 w-[1px] bg-slate-200 mx-1" />
          <Menu shadow="md" width={210} position="bottom-end">
            <Menu.Target>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Download size={18} />
                Exportar
                <ChevronDown size={14} className="text-slate-400" />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<Save size={15} />}
                onClick={handleSaveBackup}
              >
                Guardar copia (JSON)
              </Menu.Item>
              <Menu.Item
                leftSection={<Download size={15} />}
                onClick={handleExportJSON}
              >
                Esquema de eventos (JSON)
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<FileDown size={15} />}
                onClick={handleExportPDF}
              >
                Exportar PDF
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          {/* Edit / Publish toggle button */}
          {isAdmin && (
            <button
              onClick={toggleEdit}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              {isEditing ? 'Publicar' : 'Editar'}
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden relative">
        {/* Editor Content */}
        <main className="flex-grow p-4 md:p-8 print:p-0 overflow-y-auto">
          <div className="max-w-[1000px] mx-auto bg-white min-h-[11in] shadow-sm rounded-xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:m-0 print:max-w-none">
            <div className="p-8 md:p-12 print:p-0">
              {isEditing ? (
                <input
                  type="text"
                  value={guide.title}
                  onChange={handleTitleChange}
                  placeholder="Título de la guía..."
                  className="w-full text-5xl font-extrabold text-slate-900 border-none outline-none mb-8 placeholder:text-slate-200 bg-transparent"
                />
              ) : (
                <h1 className="text-base font-medium text-slate-400 mb-6">{guide.title || "Sin título"}</h1>
              )}

              <ErrorBoundary>
                <TiptapEditor
                  key={guide.id}
                  initialContent={guide.content}
                  initialMarkdown={initialMarkdown}
                  onChange={handleContentChange}
                  editable={isEditing}
                />
              </ErrorBoundary>
            </div>
          </div>
        </main>

        {/* Resizable Sidebar (TOC) */}
        {isTocOpen && (
          <>
            {/* Resize Handle */}
            <div 
              className="no-print w-1 bg-slate-200 hover:bg-blue-400 cursor-col-resize transition-colors z-10"
              onMouseDown={(e) => {
                const startX = e.pageX;
                const startWidth = tocWidth;
                const onMouseMove = (e: MouseEvent) => {
                  const newWidth = startWidth - (e.pageX - startX);
                  if (newWidth > 150 && newWidth < 500) {
                    setTocWidth(newWidth);
                  }
                };
                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            />
            
            <aside 
              className="no-print bg-white border-l border-slate-200 flex flex-col sticky top-0 h-full overflow-hidden"
              style={{ width: `${tocWidth}px` }}
            >
              <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Documento</span>
                <button 
                  onClick={() => setIsTocOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  title="Cerrar índice"
                >
                  <PanelRightClose size={16} />
                </button>
              </div>
              <TableOfContents 
                content={guide.content || {}} 
              />
            </aside>
          </>
        )}

        {/* Floating Toggle Button (when closed) */}
        {!isTocOpen && (
          <button
            onClick={() => setIsTocOpen(true)}
            className="no-print absolute right-6 bottom-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center z-30"
            title="Abrir índice"
          >
            <PanelRightOpen size={24} />
          </button>
        )}
      </div>
    </div>
  );
};
