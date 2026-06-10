import React, { useState, useEffect, useCallback } from "react";
import { FolderPlus, ChevronRight, ChevronLeft, ChevronDown, Folder, FileText, Search, MoreVertical, Plus, Copy, Trash2, Edit2, Home, BookOpen } from "lucide-react";
import { storage } from "../services/storage";
import type { Guide, Folder as FolderType } from "../types";
import { v4 as uuidv4 } from "uuid";
import { ScrollArea, TextInput, ActionIcon, Menu, Button, Tooltip, Modal } from "@mantine/core";
import { useAuth } from "./AuthProvider";
import { FullTextSearch } from "./FullTextSearch";

interface SidebarProps {
  onSelectGuide: (id: string) => void;
  activeGuideId: string | null;
  onNewGuide: (folderId?: string | null) => void;
  onGoHome: () => void;
}

interface DialogState {
  type: 'create_folder' | 'rename' | 'delete_folder' | 'delete_guide';
  title: string;
  message?: string;
  placeholder?: string;
  value?: string;
  onConfirm: (val?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSelectGuide, activeGuideId, onNewGuide, onGoHome }) => {
  const { user } = useAuth();
  const isAdmin = user?.customRole === 'admin';
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("expanded_folders");
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch (e) {
        return new Set();
      }
    }
    return new Set();
  });
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'guide' | 'folder' } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('guides_sidebar_collapsed') === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('guides_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem('guides_sidebar_width');
    return stored ? parseInt(stored, 10) : 256;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarElement = document.getElementById("guides-sidebar-wrapper");
      if (!sidebarElement) return;

      const rect = sidebarElement.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      localStorage.setItem('guides_sidebar_width', sidebarWidth.toString());
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    localStorage.setItem("expanded_folders", JSON.stringify(Array.from(expandedFolders)));
  }, [expandedFolders]);

  const refreshData = () => {
    setFolders(storage.getFolders());
    setGuides(storage.getGuides());
  };

  // Initial load
  useEffect(() => {
    refreshData();
    window.addEventListener("storage_synced", refreshData);
    return () => window.removeEventListener("storage_synced", refreshData);
  }, []);

  // Update on guide selection or changes
  useEffect(() => {
    refreshData();
  }, [activeGuideId]);

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = (parentId: string | null = null) => {
    setDialog({
      type: 'create_folder',
      title: 'Nueva Carpeta',
      placeholder: 'Nombre de la carpeta...',
      value: '',
      onConfirm: (name) => {
        if (!name?.trim()) return;
        const newFolder: FolderType = {
          id: uuidv4(),
          name: name.trim(),
          parentId,
        };
        storage.saveFolder(newFolder);
        refreshData();
        
        // Ensure parent is expanded and new folder is expanded
        const nextExpanded = new Set(expandedFolders);
        if (parentId) nextExpanded.add(parentId);
        nextExpanded.add(newFolder.id);
        setExpandedFolders(nextExpanded);
      }
    });
  };

  const handleRename = (id: string, type: 'guide' | 'folder', currentName: string) => {
    setDialog({
      type: 'rename',
      title: `Renombrar ${type === 'guide' ? 'guía' : 'carpeta'}`,
      placeholder: 'Nuevo nombre...',
      value: currentName,
      onConfirm: (newName) => {
        if (!newName?.trim() || newName.trim() === currentName) return;
        if (type === 'guide') {
          const guide = storage.getGuide(id);
          if (guide) {
            storage.saveGuide({ ...guide, title: newName.trim() });
          }
        } else {
          const folder = folders.find(f => f.id === id);
          if (folder) {
            storage.saveFolder({ ...folder, name: newName.trim() });
          }
        }
        refreshData();
      }
    });
  };

  const handleCopy = (id: string, type: 'guide' | 'folder') => {
    if (type === 'guide') {
      storage.copyGuide(id);
    } else {
      storage.copyFolder(id);
    }
    refreshData();
  };

  const handleDeleteFolder = (id: string) => {
    setDialog({
      type: 'delete_folder',
      title: 'Eliminar carpeta',
      message: '¿Eliminar carpeta? Se eliminarán también todas las subcarpetas y guías que contenga de forma permanente.',
      onConfirm: () => {
        storage.deleteFolder(id);
        refreshData();
      }
    });
  };

  const handleDeleteGuide = (id: string) => {
    setDialog({
      type: 'delete_guide',
      title: 'Eliminar guía',
      message: '¿Estás seguro de eliminar esta guía?',
      onConfirm: () => {
        storage.deleteGuide(id);
        refreshData();
      }
    });
  };

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, id: string, type: 'guide' | 'folder') => {
    if (!isAdmin) return;
    setDraggedItem({ id, type });
    e.dataTransfer.setData("id", id);
    e.dataTransfer.setData("type", type);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(id);
    e.dataTransfer.dropEffect = "move";
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(null);
  };

  const onDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const id = e.dataTransfer.getData("id");
    const type = e.dataTransfer.getData("type") as 'guide' | 'folder';

    if (type === 'guide') {
      storage.moveGuide(id, targetFolderId);
    } else {
      if (id !== targetFolderId) {
        storage.moveFolder(id, targetFolderId);
      }
    }
    setDraggedItem(null);
    refreshData();
    
    // Auto-expand target folder on drop
    if (targetFolderId) {
      setExpandedFolders(prev => new Set(prev).add(targetFolderId));
    }
  };

  const filteredGuides = guides.filter(g => 
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderFolder = (folder: FolderType, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = folders.filter(f => f.parentId === folder.id);
    const folderGuides = filteredGuides.filter(g => g.folderId === folder.id);
    const isBeingDragged = draggedItem?.id === folder.id && draggedItem?.type === 'folder';

    return (
      <div 
        key={folder.id} 
        className={`select-none ${isBeingDragged ? 'opacity-40' : ''}`}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
      >
        <div 
          draggable={isAdmin}
          onDragStart={(e) => onDragStart(e, folder.id, 'folder')}
          className={`flex items-center gap-1 py-1.5 px-2 hover:bg-slate-100 rounded-md cursor-pointer group transition-all relative ${dragOverId === folder.id ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''}`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          <Folder size={16} className={isExpanded ? "text-blue-500 fill-blue-50" : "text-slate-400"} />
          <span className="text-sm font-medium text-slate-700 truncate flex-grow">{folder.name}</span>
          
          {isAdmin && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
              <Menu shadow="md" width={180} position="right-start">
                <Menu.Target>
                  <ActionIcon size="xs" variant="subtle" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical size={12} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<Plus size={14} />} onClick={() => onNewGuide(folder.id)}>Nueva guía</Menu.Item>
                  <Menu.Item leftSection={<FolderPlus size={14} />} onClick={() => handleCreateFolder(folder.id)}>Nueva subcarpeta</Menu.Item>
                  <Menu.Item leftSection={<Edit2 size={14} />} onClick={() => handleRename(folder.id, 'folder', folder.name)}>Renombrar</Menu.Item>
                  <Menu.Item leftSection={<Copy size={14} />} onClick={() => handleCopy(folder.id, 'folder')}>Duplicar</Menu.Item>
                  <Menu.Divider />
                  <Menu.Item color="red" leftSection={<Trash2 size={14} />} onClick={() => handleDeleteFolder(folder.id)}>Eliminar</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="mt-0.5">
            {childFolders.map(f => renderFolder(f, level + 1))}
            {folderGuides.map(g => renderGuide(g, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderGuide = (guide: Guide, level: number = 0) => {
    const isBeingDragged = draggedItem?.id === guide.id && draggedItem?.type === 'guide';
    
    return (
      <div 
        key={guide.id}
        draggable={isAdmin}
        onDragStart={(e) => onDragStart(e, guide.id, 'guide')}
        className={`flex items-center gap-2 py-1.5 px-2 hover:bg-slate-100 rounded-md cursor-pointer group transition-colors relative ${activeGuideId === guide.id ? 'bg-blue-50 text-blue-700 font-medium' : ''} ${isBeingDragged ? 'opacity-40' : ''}`}
        style={{ paddingLeft: `${level * 12 + 28}px` }}
        onClick={() => onSelectGuide(guide.id)}
      >
        <FileText size={14} className={activeGuideId === guide.id ? 'text-blue-600' : 'text-slate-400'} />
        <span className="text-sm truncate flex-grow">{guide.title || "Sin título"}</span>
        
        {isAdmin && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
            <Menu shadow="md" width={160} position="right-start">
              <Menu.Target>
                <ActionIcon size="xs" variant="subtle" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical size={12} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<Edit2 size={14} />} onClick={() => handleRename(guide.id, 'guide', guide.title)}>Renombrar</Menu.Item>
                <Menu.Item leftSection={<Copy size={14} />} onClick={() => handleCopy(guide.id, 'guide')}>Duplicar</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<Trash2 size={14} />} onClick={() => handleDeleteGuide(guide.id)}>Eliminar</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(f => !f.parentId);
  const unclassifiedGuides = filteredGuides.filter(g => !g.folderId);

  return (
    <div 
      id="guides-sidebar-wrapper"
      className={`shrink-0 transition-all duration-300 ease-in-out no-print relative`}
      style={{ width: isCollapsed ? 48 : sidebarWidth, minWidth: isCollapsed ? 48 : sidebarWidth }}
    >
      <aside 
        onMouseEnter={() => { if (isCollapsed) setIsHovered(true); }}
        onMouseLeave={() => { setIsHovered(false); }}
        className={`h-screen border-r border-slate-200 bg-white flex flex-col no-print z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'absolute shadow-xl shadow-slate-200/50' : ''}`}
        style={{ width: isCollapsed && !isHovered ? 48 : sidebarWidth }}
      >
        {/* Resize Handle */}
        {(!isCollapsed || isHovered) && (
          <div 
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400/30 active:bg-blue-500/50 z-50 transition-colors"
            onMouseDown={startResizing}
          />
        )}
        
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
          <div className={`flex items-center justify-between ${isCollapsed && !isHovered ? 'flex-col gap-3' : ''}`}>
            {(!isCollapsed || isHovered) ? (
              <div 
                onClick={onGoHome}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                title="Ir al Inicio del Workspace"
              >
                <Home size={18} className="text-slate-500" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-0.5">Guías de Medición</span>
              </div>
            ) : (
              <Tooltip label="Ir al Inicio" position="right">
                <ActionIcon variant="subtle" color="slate" onClick={onGoHome}>
                  <Home size={18} className="text-slate-500 hover:text-blue-600 transition-colors" />
                </ActionIcon>
              </Tooltip>
            )}
            
            <Tooltip label={isCollapsed ? "Expandir barra de guías" : "Contraer barra de guías"} position="right">
              <ActionIcon variant="subtle" color="gray" onClick={toggleCollapsed} className={isCollapsed && !isHovered ? "" : "ml-2 shrink-0"}>
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </ActionIcon>
            </Tooltip>
          </div>

          {(!isCollapsed || isHovered) ? (
            <div className="mt-2 mb-1">
              <FullTextSearch onSelectGuide={onSelectGuide} />
            </div>
          ) : (
            <Tooltip label="Buscar en guías" position="right">
              <ActionIcon variant="subtle" color="gray" onClick={() => { setIsCollapsed(false); setIsHovered(true); }} className="mx-auto mt-2">
                <Search size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          {(!isCollapsed || isHovered) && (
            <hr className="border-slate-200 my-2" />
          )}

          {(!isCollapsed || isHovered) && (
            <div className="px-1 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Árbol de Documentos</span>
            </div>
          )}

          {(!isCollapsed || isHovered) && (
            <div className="flex gap-2 mb-4">
              <TextInput
                placeholder="Filtrar árbol..."
                size="xs"
                leftSection={<Search size={14} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                className="flex-1"
              />
              {isAdmin && (
                <Tooltip label="Nueva Carpeta Raíz" position="bottom">
                  <ActionIcon variant="light" color="blue" size="md" onClick={() => handleCreateFolder(null)}>
                    <FolderPlus size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </div>
          )}

        </div>

        {(!isCollapsed || isHovered) ? (
          <ScrollArea 
            className="flex-grow p-2 pt-0" 
            onDragOver={(e) => onDragOver(e, null)} 
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, null)}
          >
            <div className="space-y-1">
              {rootFolders.map(f => renderFolder(f))}
              
              <div className="mt-6">
                <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Sin clasificar</span>
                </div>
                <div className="space-y-0.5">
                  {unclassifiedGuides.map(g => renderGuide(g))}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-grow flex flex-col items-center py-4 gap-4 text-slate-400 select-none">
            <Folder size={18} />
            <FileText size={18} />
          </div>
        )}

        {isAdmin && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            {(!isCollapsed || isHovered) ? (
              <Button 
                fullWidth 
                variant="light" 
                size="xs" 
                leftSection={<Plus size={16} />}
                onClick={() => onNewGuide(null)}
              >
                Nueva guía rápida
              </Button>
            ) : (
              <Tooltip label="Nueva guía rápida" position="right">
                <ActionIcon variant="light" color="blue" size="md" className="mx-auto" onClick={() => onNewGuide(null)}>
                  <Plus size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </div>
        )}

      <Modal
        opened={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.title}
        centered
        size="sm"
        withCloseButton
        styles={{
          title: { fontWeight: 600, color: '#1e293b' },
          header: { borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }
        }}
      >
        {dialog && (
          <div className="space-y-4">
            {(dialog.type === 'create_folder' || dialog.type === 'rename') ? (
              <TextInput
                data-autofocus
                placeholder={dialog.placeholder}
                value={dialog.value || ""}
                onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    dialog.onConfirm(dialog.value);
                    setDialog(null);
                  }
                }}
              />
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed">{dialog.message}</p>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="subtle" color="gray" size="xs" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button 
                color={dialog.type.startsWith('delete') ? 'red' : 'blue'} 
                size="xs"
                onClick={() => {
                  dialog.onConfirm(dialog.value);
                  setDialog(null);
                }}
              >
                {dialog.type.startsWith('delete') ? 'Eliminar' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      </aside>
    </div>
  );
};
