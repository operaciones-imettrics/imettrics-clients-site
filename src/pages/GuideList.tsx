import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Text, Group, Progress } from '@mantine/core';
import { Plus, FileText, Trash2, Clock, Folder, ChevronRight, BookOpen, Upload, FolderOpen, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { Guide, Folder as FolderType } from "../types";
import { storage } from "../services/storage";
import { importGitBook } from "../services/gitbookImporter";
import { parseGitbookMarkdown } from "../lib/gitbookParser";
import { v4 as uuidv4 } from "uuid";

interface GuideListProps {
  onSelectGuide: (id: string) => void;
  onNewGuide: (folderId: string | null) => void;
}

export const GuideList: React.FC<GuideListProps> = ({
  onSelectGuide,
  onNewGuide,
}) => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    () => localStorage.getItem("current_folder_id")
  );

  // States for GitBook Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<"zip" | "folder" | "md" | "json">("zip");
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [importError, setImportError] = useState("");
  const [importStats, setImportStats] = useState<{ folderCount: number; guideCount: number; firstGuideId: string | null } | null>(null);
  const [skipImages, setSkipImages] = useState(false);
  const [importLogs, setImportLogs] = useState<{ message: string; type: "info" | "success" | "warning" }[]>([]);

  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    setGuides(storage.getGuides());
    setFolders(storage.getFolders());
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (currentFolderId) {
      localStorage.setItem("current_folder_id", currentFolderId);
    } else {
      localStorage.removeItem("current_folder_id");
    }
    // Dispatch local event so sidebar or other components keep in sync
    window.dispatchEvent(new Event("current_folder_changed"));
  }, [currentFolderId]);

  useEffect(() => {
    const handleFolderChanged = () => {
      setCurrentFolderId(localStorage.getItem("current_folder_id"));
    };
    window.addEventListener("current_folder_changed", handleFolderChanged);
    return () => {
      window.removeEventListener("current_folder_changed", handleFolderChanged);
    };
  }, []);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openDeleteModal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
    setModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      storage.deleteGuide(deleteId);
      refreshData();
    }
    setModalOpen(false);
    setDeleteId(null);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleZipImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      runImport(file);
    }
  };

  const handleFolderImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      runImport(Array.from(files));
    }
  };

  const handleMdImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus("processing");
    setImportProgress(10);
    setImportError("");
    setImportStats(null);
    setImportLogs([
      { message: `🕒 [Preprocesando] ${file.name}`, type: "info" }
    ]);

    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const text = await file.text();
      setImportProgress(50);
      setImportLogs(prev => [
        ...prev,
        { message: `⚙️ [Migrando al editor] Creando documento TipTap de alta fidelidad...`, type: "warning" }
      ]);
      
      const { title: fmTitle, jsonContent } = await parseGitbookMarkdown(text);
      const title = fmTitle || file.name.replace(/\.md$/i, "");
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setImportProgress(80);
      setImportLogs(prev => [
        ...prev,
        { message: `🔗 [Resolviendo enlaces] Guardando en almacenamiento local...`, type: "success" }
      ]);

      const newId = uuidv4();
      const newGuide = {
        id: newId,
        title: title,
        folderId: currentFolderId,
        content: jsonContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      storage.saveGuide(newGuide);
      
      setImportProgress(100);
      setImportStats({
        folderCount: 0,
        guideCount: 1,
        firstGuideId: newId
      });
      setImportStatus("success");
      refreshData();
    } catch (err: any) {
      console.error(err);
      setImportStatus("error");
      setImportError(err.message || "Ocurrió un error al procesar el archivo Markdown.");
    }
  };

  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus("processing");
    setImportProgress(10);
    setImportError("");
    setImportStats(null);
    setImportLogs([
      { message: `🕒 [Preprocesando] Leyendo ${file.name}...`, type: "info" }
    ]);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const text = await file.text();
      const rawData = JSON.parse(text);
      
      setImportProgress(40);
      setImportLogs(prev => [
        ...prev,
        { message: `🔍 [Analizando] Detectando formato del archivo JSON...`, type: "info" }
      ]);

      let title = file.name.replace(/\.json$/i, "");
      let content: any = null;

      if (rawData.type === "doc" && Array.isArray(rawData.content)) {
        content = rawData;
        setImportLogs(prev => [
          ...prev,
          { message: `⚙️ [Migrando] Detectado formato nativo TipTap (documento directo)`, type: "warning" }
        ]);
      } else if (rawData.content && rawData.content.type === "doc") {
        content = rawData.content;
        if (rawData.title) title = rawData.title;
        setImportLogs(prev => [
          ...prev,
          { message: `⚙️ [Migrando] Detectado formato nativo TipTap (con título)`, type: "warning" }
        ]);
      } else if (rawData.guide && Array.isArray(rawData.events)) {
        title = rawData.guide;
        setImportLogs(prev => [
          ...prev,
          { message: `⚙️ [Migrando] Detectado formato: Esquema de Eventos (${rawData.events.length} eventos)`, type: "warning" }
        ]);

        const contentNodes: any[] = [];
        rawData.events.forEach((event: any) => {
          contentNodes.push({
            type: "heading",
            attrs: { level: event.level || 4 },
            content: [{ type: "text", text: event.name || "Evento sin nombre" }]
          });
          
          if (Array.isArray(event.elements) && event.elements.length > 0) {
            event.elements.forEach((el: any) => {
              if (el.type === "paragraph" && el.text) {
                contentNodes.push({
                  type: "paragraph",
                  content: [{ type: "text", text: el.text }]
                });
              } else if (el.type === "callout" && el.text) {
                contentNodes.push({
                  type: "callout",
                  attrs: { type: el.style || "info" },
                  content: [{
                    type: "paragraph",
                    content: [{ type: "text", text: el.text }]
                  }]
                });
              } else if (el.type === "codeBlock" && el.code) {
                contentNodes.push({
                  type: "codeBlock",
                  attrs: { language: el.language || "javascript" },
                  content: [{ type: "text", text: el.code }]
                });
              } else if (el.type === "parameterTable" && Array.isArray(el.parameters)) {
                contentNodes.push({
                  type: "parameterTable",
                  attrs: {
                    rows: JSON.stringify(el.parameters.map((p: any) => ({
                      parameter: p.param || "",
                      value: p.value || "",
                      type: p.type || ""
                    }))),
                    columnWidths: [33, 33, 34]
                  }
                });
              } else if (el.type === "collapsible" && el.content) {
                contentNodes.push({
                  type: "collapsibleBlock",
                  attrs: { open: true },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: el.title || "Detalles" }]
                    },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: el.content }]
                    }
                  ]
                });
              } else if ((el.type === "unorderedList" || el.type === "orderedList") && Array.isArray(el.items)) {
                contentNodes.push({
                  type: el.type === "unorderedList" ? "bulletList" : "orderedList",
                  content: el.items.map((itemStr: string) => ({
                    type: "listItem",
                    content: [{
                      type: "paragraph",
                      content: [{ type: "text", text: itemStr }]
                    }]
                  }))
                });
              }
            });
          } else {
            // Fallback backward compatibility for older JSON structures
            if (event.parameters && event.parameters.length > 0) {
              const rows = event.parameters.map((p: any) => ({
                parameter: p.param || p.parameter || "",
                value: p.value || "",
                type: p.type || ""
              }));
              contentNodes.push({
                type: "parameterTable",
                attrs: {
                  rows: JSON.stringify(rows),
                  columnWidths: [33, 33, 34]
                }
              });
            }
            
            if (event.dataLayer) {
              contentNodes.push({
                type: "codeBlock",
                attrs: { language: "javascript" },
                content: [{ type: "text", text: event.dataLayer }]
              });
            }
          }
        });

        content = {
          type: "doc",
          content: contentNodes.length > 0 ? contentNodes : [{ type: "paragraph" }]
        };
      } else {
        throw new Error("El archivo JSON no tiene un formato compatible. Debe ser un documento TipTap o un esquema de eventos exportado.");
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setImportProgress(80);
      setImportLogs(prev => [
        ...prev,
        { message: `🔗 [Guardando] Creando guía en el editor...`, type: "success" }
      ]);

      const newId = uuidv4();
      const newGuide = {
        id: newId,
        title: title,
        folderId: currentFolderId,
        content: content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      storage.saveGuide(newGuide);

      setImportProgress(100);
      setImportStats({
        folderCount: 0,
        guideCount: 1,
        firstGuideId: newId
      });
      setImportStatus("success");
      refreshData();
    } catch (err: any) {
      console.error(err);
      setImportStatus("error");
      setImportError(err.message || "Ocurrió un error al procesar el archivo JSON.");
    }
  };

  const runImport = async (input: File | File[]) => {
    setImportStatus("processing");
    setImportProgress(0);
    setImportError("");
    setImportStats(null);
    setImportLogs([]);
    try {
      const stats = await importGitBook(
        input,
        (progress) => {
          setImportProgress(progress);
        },
        {
          skipImages,
          onStatusChange: (fileName, phase) => {
            let msg = "";
            let type: "info" | "success" | "warning" = "info";
            if (phase === "pre") {
              msg = `🕒 [Preprocesando] ${fileName}`;
              type = "info";
            } else if (phase === "mig") {
              msg = `⚙️ [Migrando al editor] ${fileName}`;
              type = "warning";
            } else if (phase === "lnk") {
              msg = `🔗 [Resolviendo enlaces] ${fileName}`;
              type = "success";
            }
            setImportLogs((prev) => [...prev, { message: msg, type }]);
          },
        }
      );
      setImportStats(stats);
      setImportStatus("success");
      refreshData();
    } catch (err: any) {
      console.error(err);
      setImportStatus("error");
      setImportError(err.message || "Ocurrió un error al procesar el archivo. Asegúrate de que tenga una estructura de GitBook válida.");
    }
  };

  const currentFolder = folders.find(f => f.id === currentFolderId);
  const displayedFolders = folders.filter(f => f.parentId === currentFolderId);
  const displayedGuides = guides.filter(g => g.folderId === currentFolderId);

  // Breadcrumbs logic
  const getBreadcrumbs = () => {
    const crumbs = [];
    let tempId = currentFolderId;
    while (tempId) {
      const f = folders.find(folder => folder.id === tempId);
      if (f) {
        crumbs.unshift(f);
        tempId = f.parentId;
      } else {
        tempId = null;
      }
    }
    return crumbs;
  };

  const crumbs = getBreadcrumbs();

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {currentFolder ? currentFolder.name : "Mis Clientes"}
            </h1>
            <p className="text-slate-500 mt-1">
              {currentFolder ? "Gestiona los proyectos y guías de este cliente" : "Explora tus clientes y proyectos de medición"}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              leftSection={<BookOpen size={18} />}
              onClick={() => {
                setImportStatus("idle");
                setImportProgress(0);
                setImportError("");
                setImportStats(null);
                setIsImportModalOpen(true);
              }}
              variant="outline"
              color="blue"
            >
              Importar Guías
            </Button>
            <Button 
              leftSection={<Plus size={18} />} 
              onClick={() => onNewGuide(currentFolderId)}
              variant="filled"
              color="blue"
            >
              Nueva guía
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 py-2 px-4 bg-slate-100/50 rounded-lg border border-slate-200/60">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={`text-sm font-medium ${!currentFolderId ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Inicio
          </button>
          {crumbs.map((crumb) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight size={14} className="text-slate-300" />
              <button 
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`text-sm font-medium ${crumb.id === currentFolderId ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </header>

      {displayedFolders.length === 0 && displayedGuides.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-20 text-center">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="text-slate-400" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Esta sección está vacía</h2>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto">Comienza creando una nueva carpeta o guía aquí mismo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Folders first */}
          {displayedFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => setCurrentFolderId(folder.id)}
              className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                <Folder size={32} className="text-blue-500 fill-blue-50 group-hover:fill-blue-100" />
              </div>
              <h3 className="font-bold text-slate-800 truncate w-full px-2">{folder.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Carpeta</p>
            </div>
          ))}

          {/* Guides second */}
          {displayedGuides.map((guide) => (
            <div
              key={guide.id}
              onClick={() => onSelectGuide(guide.id)}
              className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all flex flex-col relative"
            >
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
                <FileText size={24} className="text-slate-400 group-hover:text-blue-500" />
              </div>
              <h3 className="font-bold text-slate-800 line-clamp-2 pr-6 mb-2">{guide.title || "Guía sin título"}</h3>
              <div className="mt-auto flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                <Clock size={12} />
                <span>{formatDate(guide.updatedAt)}</span>
              </div>
              <button
                onClick={(e) => openDeleteModal(e, guide.id)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      <Modal
        opened={modalOpen}
        onClose={() => setDeleteId(null)}
        title="Confirmar eliminación"
        centered
      >
        <Text size="sm">¿Estás seguro de que quieres eliminar esta guía? Esta acción no se puede deshacer.</Text>
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Eliminar guía
          </Button>
        </Group>
      </Modal>

      {/* Modal de Importación Unificado */}
      <Modal
        opened={isImportModalOpen}
        onClose={() => importStatus !== "processing" && setIsImportModalOpen(false)}
        title={
          <div className="flex items-center gap-2 font-bold text-slate-900 text-lg">
            <BookOpen className="text-blue-600" size={22} />
            <span>Importar Guías de Medición</span>
          </div>
        }
        size="lg"
        centered
        closeOnClickOutside={importStatus !== "processing"}
        closeOnEscape={importStatus !== "processing"}
        withCloseButton={importStatus !== "processing"}
      >
        {importStatus === "idle" && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
              {importTab === "zip" && (
                <>
                  <span className="font-bold text-slate-800 block mb-1">¿Cómo exportar desde GitBook (ZIP)?</span>
                  Puedes exportar tu documentación como un archivo **Markdown (ZIP)** en los ajustes de espacio en GitBook o descargar el repositorio sincronizado de GitHub en formato ZIP.
                </>
              )}
              {importTab === "folder" && (
                <>
                  <span className="font-bold text-slate-800 block mb-1">Importar Carpeta de GitBook</span>
                  Selecciona la carpeta local descomprimida que contiene la documentación de tu GitBook. Debe incluir el archivo principal `SUMMARY.md`.
                </>
              )}
              {importTab === "md" && (
                <>
                  <span className="font-bold text-slate-800 block mb-1">Importar archivo Markdown (.md)</span>
                  Sube un único archivo `.md`. Se aplicará el motor de preprocesamiento avanzado de GitBook para reconstruir callouts, tablas de parámetros y dataLayers.
                </>
              )}
              {importTab === "json" && (
                <>
                  <span className="font-bold text-slate-800 block mb-1">Importar archivo JSON (.json)</span>
                  Soporta formatos nativos de TipTap y el esquema de log estructurado de eventos de medición.
                </>
              )}
            </div>

            {/* Tab selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 p-1 rounded-lg border border-slate-200/50 gap-1">
              <button
                className={`py-2 px-1 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  importTab === "zip"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setImportTab("zip")}
              >
                <Upload size={14} />
                GitBook ZIP
              </button>
              <button
                className={`py-2 px-1 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  importTab === "folder"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setImportTab("folder")}
              >
                <FolderOpen size={14} />
                GitBook Carpeta
              </button>
              <button
                className={`py-2 px-1 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  importTab === "md"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setImportTab("md")}
              >
                <FileText size={14} />
                Markdown (.md)
              </button>
              <button
                className={`py-2 px-1 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  importTab === "json"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setImportTab("json")}
              >
                <FileText size={14} />
                JSON (.json)
              </button>
            </div>

            {/* Drag & Drop Areas depending on importTab */}
            {importTab === "zip" && (
              <div
                onClick={() => zipInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-10 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/20"
              >
                <Upload className="mx-auto text-slate-300 group-hover:text-blue-500 mb-4 transition-colors" size={48} />
                <span className="font-bold text-slate-700 block group-hover:text-blue-600">
                  Haz clic para seleccionar el archivo ZIP
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Sube el archivo .zip descargado directamente de GitBook o GitHub
                </span>
                <input
                  type="file"
                  accept=".zip"
                  ref={zipInputRef}
                  className="hidden"
                  onChange={handleZipImport}
                />
              </div>
            )}

            {importTab === "folder" && (
              <div
                onClick={() => folderInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-10 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/20"
              >
                <FolderOpen className="mx-auto text-slate-300 group-hover:text-blue-500 mb-4 transition-colors" size={48} />
                <span className="font-bold text-slate-700 block group-hover:text-blue-600">
                  Haz clic para seleccionar la carpeta
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Selecciona la carpeta raíz que contiene SUMMARY.md
                </span>
                <input
                  type="file"
                  // @ts-ignore
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  ref={folderInputRef}
                  className="hidden"
                  onChange={handleFolderImport}
                />
              </div>
            )}

            {importTab === "md" && (
              <div
                onClick={() => mdInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-10 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/20"
              >
                <FileText className="mx-auto text-slate-300 group-hover:text-blue-500 mb-4 transition-colors" size={48} />
                <span className="font-bold text-slate-700 block group-hover:text-blue-600">
                  Haz clic para seleccionar el archivo Markdown
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Selecciona un archivo individual .md para procesarlo e importarlo
                </span>
                <input
                  type="file"
                  accept=".md"
                  ref={mdInputRef}
                  className="hidden"
                  onChange={handleMdImport}
                />
              </div>
            )}

            {importTab === "json" && (
              <div
                onClick={() => jsonInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-10 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/20"
              >
                <FileText className="mx-auto text-slate-300 group-hover:text-blue-500 mb-4 transition-colors" size={48} />
                <span className="font-bold text-slate-700 block group-hover:text-blue-600">
                  Haz clic para seleccionar el archivo JSON
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Sube una guía en formato nativo TipTap (.json) o log de eventos estructurado
                </span>
                <input
                  type="file"
                  accept=".json"
                  ref={jsonInputRef}
                  className="hidden"
                  onChange={handleJsonImport}
                />
              </div>
            )}

            {(importTab === "zip" || importTab === "folder") && (
              <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 text-slate-700 text-xs">
                <input
                  type="checkbox"
                  id="skip-images-checkbox"
                  checked={skipImages}
                  onChange={(e) => setSkipImages(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="skip-images-checkbox" className="font-semibold cursor-pointer select-none">
                  No importar imágenes locales (Evita problemas de límite de almacenamiento "Quota Exceeded")
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="default" onClick={() => setIsImportModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {importStatus === "processing" && (
          <div className="py-6 text-center space-y-6">
            <div className="relative inline-flex">
              <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-800 block">Procesando guías de medición</span>
              <span className="text-sm text-slate-400 block mt-1">
                Preprocesando sintaxis, traduciendo elementos interactivos y guardando en local...
              </span>
            </div>
            <div className="max-w-md mx-auto px-6">
              <Progress value={importProgress} color="blue" size="md" radius="xl" animated />
              <span className="text-xs font-bold text-blue-600 mt-2 block">{importProgress}% Completado</span>
            </div>

            {/* Live Terminal Log */}
            <div className="max-w-xl mx-auto mt-4 bg-slate-950 rounded-xl p-4 text-left font-mono text-xs border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Consola del Importador</span>
              </div>
              <div 
                className="h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent pr-1"
                ref={(el) => {
                  if (el) el.scrollTop = el.scrollHeight;
                }}
              >
                {importLogs.length === 0 ? (
                  <div className="text-slate-500 animate-pulse">Iniciando preprocesador...</div>
                ) : (
                  importLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`leading-relaxed whitespace-pre-wrap transition-opacity duration-300 ${
                        log.type === "success" 
                          ? "text-emerald-400 font-bold" 
                          : log.type === "warning" 
                          ? "text-amber-400" 
                          : "text-slate-300"
                      }`}
                    >
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {importStatus === "success" && (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-200 shadow-sm">
              <CheckCircle2 className="text-green-500" size={36} />
            </div>
            <div>
              <span className="font-bold text-2xl text-slate-900 block">¡Guías importadas con éxito!</span>
              <span className="text-sm text-slate-500 mt-2 block max-w-sm mx-auto">
                El contenido ha sido preprocesado y convertido al formato TipTap de alta fidelidad. Ya puedes abrirlo en tu editor.
              </span>
            </div>

            {importStats && (
              <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-around text-center mt-4">
                {importStats.folderCount > 0 && (
                  <div>
                    <span className="text-2xl font-extrabold text-blue-600 block">{importStats.folderCount}</span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Carpetas</span>
                  </div>
                )}
                {importStats.folderCount > 0 && <div className="w-[1px] bg-slate-200 self-stretch" />}
                <div>
                  <span className="text-2xl font-extrabold text-blue-600 block">{importStats.guideCount}</span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documentos</span>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-6">
              <Button
                variant="default"
                onClick={() => {
                  setIsImportModalOpen(false);
                }}
              >
                Volver a la lista
              </Button>
              {importStats?.firstGuideId && (
                <Button
                  color="blue"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    if (importStats.firstGuideId) {
                      onSelectGuide(importStats.firstGuideId);
                    }
                  }}
                >
                  Ver guías importadas
                </Button>
              )}
            </div>
          </div>
        )}

        {importStatus === "error" && (
          <div className="space-y-6 pt-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-800">
              <AlertCircle size={24} className="shrink-0" />
              <div>
                <span className="font-bold block mb-1">Error en la importación</span>
                <span className="text-sm">{importError}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="default"
                onClick={() => {
                  setImportStatus("idle");
                }}
              >
                Reintentar
              </Button>
              <Button
                color="blue"
                onClick={() => {
                  setIsImportModalOpen(false);
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
